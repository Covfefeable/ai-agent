import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import axios from 'axios';
import { db } from '../db';
import { datasets } from '../db/schema';
import { inArray, eq, and } from 'drizzle-orm';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_KNOWLEDGE_API_KEY = process.env.DIFY_KNOWLEDGE_API_KEY;

const chatSchema = z.object({
  inputs: z.any().optional(),
  query: z.string(),
  conversation_id: z.string().optional(),
  files: z.array(z.object({
    type: z.string(),
    transfer_method: z.string(),
    upload_file_id: z.string()
  })).optional()
});

export async function chatRoutes(fastify: FastifyInstance) {
  // Chat API - Streaming response
  fastify.post('/message', async (request, reply) => {
    try {
      // Get current user from token (middleware should have populated this, but for now we trust auth middleware)
      const user = request.user as any; 
      
      console.log('Chat Request Body:', request.body); // Debug Log

      const { query, conversation_id, files, inputs } = chatSchema.parse(request.body);

      // Handle Knowledge Base Retrieval
      if (inputs && inputs.knowledge_base_ids && Array.isArray(inputs.knowledge_base_ids) && inputs.knowledge_base_ids.length > 0) {
        try {
          const kbIds = inputs.knowledge_base_ids as string[];
          
          // Verify ownership and get Dify IDs
          const userDatasets = await db.select()
            .from(datasets)
            .where(and(
              inArray(datasets.id, kbIds),
              eq(datasets.userId, user.id)
            ));

          if (userDatasets.length > 0) {
             const retrievalPromises = userDatasets.map(ds => 
               axios.post(
                 `${DIFY_BASE_URL}/datasets/${ds.difyId}/retrieve`,
                 { query },
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
      }

      const response = await axios.post(
        `${DIFY_BASE_URL}/chat-messages`,
        {
          inputs: inputs || {},
          query,
          response_mode: 'streaming',
          conversation_id,
          user: user.id.toString(), // Use user ID as Dify user identifier
          files: files || []
        },
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      // Proxy the streaming response
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      
      return response.data;

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Internal server error' });
    }
  });

  // File Upload API
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    try {
      const user = request.user as any;
      
      const formData = new FormData();
      // Need to convert stream to buffer or blob for axios/fetch to forward it
      const buffer = await data.toBuffer();
      const blob = new Blob([buffer], { type: data.mimetype });
      
      formData.append('file', blob, data.filename);
      formData.append('user', user.id.toString());

      const response = await axios.post(
        `${DIFY_BASE_URL}/files/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            // Axios automatically sets Content-Type for FormData, but we might need to be careful
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Upload failed' });
    }
  });

  // Get Conversations List
  fastify.get('/conversations', async (request, reply) => {
    try {
      const user = request.user as any;
      const { last_id, limit = 20 } = request.query as { last_id?: string; limit?: number };

      const response = await axios.get(`${DIFY_BASE_URL}/conversations`, {
        params: {
          user: user.id.toString(),
          last_id,
          limit
        },
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`
        }
      });

      return response.data;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Failed to fetch conversations' });
    }
  });

  // Delete Conversation
  fastify.delete('/conversations/:id', async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      const response = await axios.delete(`${DIFY_BASE_URL}/conversations/${id}`, {
        data: {
          user: user.id.toString()
        },
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Failed to delete conversation' });
    }
  });

  // Get Messages History
  fastify.get('/messages', async (request, reply) => {
    try {
      const user = request.user as any;
      const { conversation_id, first_id, limit = 20 } = request.query as { conversation_id: string; first_id?: string; limit?: number };

      const response = await axios.get(`${DIFY_BASE_URL}/messages`, {
        params: {
          user: user.id.toString(),
          conversation_id,
          first_id,
          limit
        },
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`
        }
      });

      return response.data;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Failed to fetch messages' });
    }
  });

  // Message Feedback
  fastify.post('/messages/:message_id/feedbacks', async (request, reply) => {
    try {
      const user = request.user as any;
      const { message_id } = request.params as { message_id: string };
      const { rating } = request.body as { rating: 'like' | 'dislike' | null };

      const response = await axios.post(
        `${DIFY_BASE_URL}/messages/${message_id}/feedbacks`,
        {
          rating,
          user: user.id.toString()
        },
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Failed to submit feedback' });
    }
  });

  // Stop Generation
  fastify.post('/messages/:task_id/stop', async (request, reply) => {
    try {
      const user = request.user as any;
      const { task_id } = request.params as { task_id: string };

      const response = await axios.post(
        `${DIFY_BASE_URL}/chat-messages/${task_id}/stop`,
        {
          user: user.id.toString()
        },
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Failed to stop generation' });
    }
  });
}
