import axios from 'axios';
import { db } from '../db';
import { datasets, users, models } from '../db/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { createUsageLogStream } from '../lib/usage';
import { memoryService } from './memories';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_SUPER_AGENT_CHAT_API_KEY = process.env.DIFY_SUPER_AGENT_CHAT_API_KEY;
const DIFY_KNOWLEDGE_API_KEY = process.env.DIFY_KNOWLEDGE_API_KEY;

export const chatService = {
  async chatMessage(user: any, payload: any) {
    const { inputs, query, conversation_id, files } = payload;

    // Check balance
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) {
      throw new Error('用户不存在');
    }
    if (dbUser.role === 'member' && Number(dbUser.balance) <= 0) {
      throw new Error('余额不足，请充值');
    }

    // Handle Knowledge Base Retrieval
    if (inputs && inputs.knowledge_base_ids && Array.isArray(inputs.knowledge_base_ids) && inputs.knowledge_base_ids.length > 0) {
      try {
        const kbIds = inputs.knowledge_base_ids as string[];
        
        // Verify ownership and get Dify IDs
        const userDatasets = await db
          .select()
          .from(datasets)
          .where(
            ['owner', 'admin'].includes(dbUser.role)
              ? inArray(datasets.id, kbIds)
              : and(inArray(datasets.id, kbIds), eq(datasets.userId, user.id))
          );

        if (userDatasets.length > 0) {
            const topK = inputs.top_k || 5;
            const retrievalPromises = userDatasets.map(ds => 
              axios.post(
                `${DIFY_BASE_URL}/datasets/${ds.difyId}/retrieve`,
                { 
                  query,
                  retrieval_model: {
                    reranking_enable: false,
                    top_k: topK,
                    score_threshold_enabled: false
                  }
                },
                { headers: { 'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}` } }
              ).then(res => res.data)
            );

            const results = await Promise.all(retrievalPromises);
            
            // Merge results
            const allSegments = results.flatMap((r: any) => r.records.map((rec: any) => rec.segment.content));
            const uniqueSegments = Array.from(new Set(allSegments));
            const knowledgeContext = uniqueSegments.join('\n\n');
            
            inputs.knowledge = knowledgeContext;
        }
      } catch (error) {
          console.error('Server-side retrieval failed:', error);
      }
      
      // Clean up inputs to avoid sending internal fields to Dify
      delete inputs.knowledge_base_ids;
      delete inputs.top_k;
    }

    // 注入用户记忆
    try {
      const memories = await memoryService.getMemoriesAsString(user.id);
      if (memories) {
        inputs.memories = memories;
      }
    } catch (error) {
      console.error('Failed to inject memories:', error);
      // 记忆注入失败不应阻塞聊天
    }

    const response = await axios.post(
      `${DIFY_BASE_URL}/chat-messages`,
      {
        inputs: inputs || {},
        query,
        response_mode: 'streaming',
        conversation_id,
        user: user.id.toString(),
        files: files || []
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    let multiplier = 1.0;
    if (inputs && inputs.model) {
      const [model] = await db.select().from(models).where(eq(models.modelId, inputs.model)).limit(1);
      if (model) {
        multiplier = model.multiplier;
      }
    }

    const logStream = createUsageLogStream(user.id, dbUser.role, 'super_agent', multiplier);
    response.data.pipe(logStream);
    return logStream;
  },

  async uploadFile(user: any, fileData: any) {
    const formData = new FormData();
    const buffer = await fileData.toBuffer();
    const blob = new Blob([buffer], { type: fileData.mimetype });
    
    formData.append('file', blob, fileData.filename);
    formData.append('user', user.id.toString());

    const response = await axios.post(
      `${DIFY_BASE_URL}/files/upload`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  },

  async getConversations(user: any, params: { last_id?: string; limit?: number }) {
    const { last_id, limit = 20 } = params;
    const response = await axios.get(`${DIFY_BASE_URL}/conversations`, {
      params: {
        user: user.id.toString(),
        last_id,
        limit
      },
      headers: {
        'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`
      }
    });
    return response.data;
  },

  async deleteConversation(user: any, id: string) {
    const response = await axios.delete(`${DIFY_BASE_URL}/conversations/${id}`, {
      data: {
        user: user.id.toString()
      },
      headers: {
        'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  async getMessages(user: any, params: { conversation_id: string; first_id?: string; limit?: number }) {
    const { conversation_id, first_id, limit = 20 } = params;
    const response = await axios.get(`${DIFY_BASE_URL}/messages`, {
      params: {
        user: user.id.toString(),
        conversation_id,
        first_id,
        limit
      },
      headers: {
        'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`
      }
    });
    return response.data;
  },

  async feedbackMessage(user: any, message_id: string, rating: 'like' | 'dislike' | null) {
    const response = await axios.post(
      `${DIFY_BASE_URL}/messages/${message_id}/feedbacks`,
      {
        rating,
        user: user.id.toString()
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  },

  async stopGeneration(user: any, task_id: string) {
    const response = await axios.post(
      `${DIFY_BASE_URL}/chat-messages/${task_id}/stop`,
      {
        user: user.id.toString()
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_SUPER_AGENT_CHAT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
};
