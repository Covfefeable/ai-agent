import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { memories, memoryBuffers } from '../db/schema';
import { addBackgroundJob } from '../lib/worker';
import axios from 'axios';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_SUPER_AGENT_UTILS_API_KEY = process.env.DIFY_SUPER_AGENT_UTILS_API_KEY;

interface MemoryItem {
  category: 'general' | 'preference' | 'fact';
  content: string;
}

interface DifyWorkflowResponse {
  data: {
    status: string;
    outputs: {
      output: string; // JSON string of MemoryItem[]
    };
    error: string | null;
  };
}

export class MemoryService {
  /**
   * 获取用户的所有记忆，并拼接成字符串
   */
  async getMemoriesAsString(userId: string): Promise<string> {
    const userMemories = await db.query.memories.findMany({
      where: eq(memories.userId, userId),
      orderBy: (memories, { desc }) => [desc(memories.createdAt)],
    });

    if (!userMemories || userMemories.length === 0) {
      return '';
    }

    // 格式化输出，例如：
    // - [偏好] 喜欢吃苹果
    // - [事实] 住在北京
    return userMemories
      .map((mem) => `- [${mem.category}] ${mem.content}`)
      .join('\n');
  }

  /**
   * 将用户 Query 加入缓冲，并调度延时处理任务（防抖）
   */
  async addToBuffer(userId: string, query: string) {
    // 1. 查找或创建 Buffer
    // 由于 memoryBuffers 表对 userId 没有唯一约束（虽然逻辑上应该是一个用户一个 pending buffer），
    // 我们先查找是否有 pending 状态的 buffer
    
    // 使用事务确保一致性
    await db.transaction(async (tx) => {
      let buffer = await tx.query.memoryBuffers.findFirst({
        where: and(eq(memoryBuffers.userId, userId), eq(memoryBuffers.status, 'pending')),
      });

      if (buffer) {
        // 更新现有 Buffer
        const currentQueries = (buffer.queries as string[]) || [];
        // 简单的去重逻辑，避免完全重复的 query
        if (!currentQueries.includes(query)) {
          currentQueries.push(query);
        }
        
        await tx
          .update(memoryBuffers)
          .set({
            queries: currentQueries,
            lastQueryAt: new Date(),
          })
          .where(eq(memoryBuffers.id, buffer.id));
      } else {
        // 创建新 Buffer
        const [newBuffer] = await tx
          .insert(memoryBuffers)
          .values({
            userId,
            queries: [query],
            status: 'pending',
          })
          .returning();
        buffer = newBuffer;
      }

      // 2. 调度延时任务 (Debounce 5分钟)
      // 使用 jobKey 实现防抖：相同的 jobKey 会更新任务的 runAt 时间
      const delay = 5 * 60 * 1000; // 5 minutes
      // const delay = 10 * 1000; // 10 seconds for testing
      
      await addBackgroundJob(
        'process_memory_buffer',
        { bufferId: buffer!.id },
        {
          jobKey: `memory_buffer:${buffer!.id}`,
          runAt: new Date(Date.now() + delay),
          maxAttempts: 3, // 允许重试几次
        }
      );
    });
  }

  /**
   * 处理 Buffer：调用 Dify 提取记忆并存储
   */
  async processBuffer(bufferId: string) {
    console.log(`[MemoryService] Processing buffer ${bufferId}`);
    
    // 1. 获取并锁定 Buffer
    // 注意：drizzle 目前对 FOR UPDATE 的支持可能有限，这里依靠 status 乐观锁或简单检查
    const buffer = await db.query.memoryBuffers.findFirst({
      where: eq(memoryBuffers.id, bufferId),
    });

    if (!buffer) {
      console.log(`[MemoryService] Buffer ${bufferId} not found`);
      return;
    }

    if (buffer.status !== 'pending') {
      console.log(`[MemoryService] Buffer ${bufferId} status is ${buffer.status}, skipping`);
      return;
    }

    // 2. 更新状态为 processing
    await db
      .update(memoryBuffers)
      .set({ status: 'processing' })
      .where(eq(memoryBuffers.id, bufferId));

    try {
      const queries = buffer.queries as string[];
      if (queries.length === 0) {
        throw new Error('No queries in buffer');
      }

      // 3. 调用 Dify 工作流
      const memoriesToSave = await this.extractMemoriesFromDify(queries, buffer.userId);

      // 4. 保存记忆到数据库
      if (memoriesToSave.length > 0) {
        await db.transaction(async (tx) => {
          for (const mem of memoriesToSave) {
            await tx.insert(memories).values({
              userId: buffer.userId,
              content: mem.content,
              category: mem.category,
            });
          }
        });
        console.log(`[MemoryService] Saved ${memoriesToSave.length} memories for user ${buffer.userId}`);
      } else {
        console.log(`[MemoryService] No valid memories extracted for user ${buffer.userId}`);
      }

      // 5. 标记 Buffer 为完成 (或直接删除，为了保留历史这里标记状态)
      // 这里的逻辑可以根据需求调整，如果觉得历史 buffer 没用可以删除
      // 为了不让表无限膨胀，我们这里选择删除已处理的 buffer
      await db.delete(memoryBuffers).where(eq(memoryBuffers.id, bufferId));

      // 6. 检查用户记忆数量，如果超过 30 条，触发压缩任务
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(memories)
        .where(eq(memories.userId, buffer.userId));
      
      const memoryCount = Number(countResult?.count || 0);
      
      if (memoryCount > 30) {
        console.log(`[MemoryService] User ${buffer.userId} has ${memoryCount} memories, triggering compression`);
        await addBackgroundJob('compress_user_memory', { userId: buffer.userId });
      }
      
    } catch (error: any) {
      console.error(`[MemoryService] Error processing buffer ${bufferId}:`, error);
      
      // 标记为失败
      await db
        .update(memoryBuffers)
        .set({ status: 'failed' })
        .where(eq(memoryBuffers.id, bufferId));
        
      throw error; // 抛出错误让 Worker 重试
    }
  }

  /**
   * 压缩用户记忆
   */
  async compressUserMemories(userId: string) {
    if (!DIFY_BASE_URL || !DIFY_SUPER_AGENT_UTILS_API_KEY) {
      throw new Error('Dify configuration missing');
    }

    console.log(`[MemoryService] Compressing memories for user ${userId}`);

    // 1. 获取所有记忆字符串
    const memoriesStr = await this.getMemoriesAsString(userId);
    if (!memoriesStr) {
      console.log(`[MemoryService] No memories to compress for user ${userId}`);
      return;
    }

    try {
      // 2. 调用 Dify 工作流进行压缩
      const response = await axios.post<DifyWorkflowResponse>(
        `${DIFY_BASE_URL}/workflows/run`,
        {
          inputs: {
            mode: 'compress_memory',
            input: memoriesStr,
          },
          response_mode: 'blocking',
          user: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${DIFY_SUPER_AGENT_UTILS_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;

      if (data.status !== 'succeeded') {
        throw new Error(`Dify workflow failed: ${data.error || 'Unknown error'}`);
      }

      const outputStr = data.outputs.output;
      
      // 3. 解析压缩后的结果
      const compressedMemories = this.parseDifyOutput(outputStr);

      if (compressedMemories.length === 0) {
        console.warn('[MemoryService] Compression returned empty result, aborting overwrite');
        return;
      }

      // 4. 覆盖用户记忆
      await db.transaction(async (tx) => {
        // 删除旧记忆
        await tx.delete(memories).where(eq(memories.userId, userId));
        
        // 插入新记忆
        for (const mem of compressedMemories) {
          await tx.insert(memories).values({
            userId,
            content: mem.content,
            category: mem.category,
          });
        }
      });

      console.log(`[MemoryService] Successfully compressed memories for user ${userId}. New count: ${compressedMemories.length}`);

    } catch (error) {
      console.error('[MemoryService] Memory compression failed:', error);
      throw error;
    }
  }

  private parseDifyOutput(outputStr: string): MemoryItem[] {
    let jsonStr = outputStr.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsed)) {
        console.warn('[MemoryService] Dify output is not an array:', parsed);
        return [];
      }

      return parsed.map((item: any) => ({
        category: ['general', 'preference', 'fact'].includes(item.category) ? item.category : 'general',
        content: item.content || '',
      })).filter(item => item.content.trim() !== '');
    } catch (e) {
      console.error('[MemoryService] Failed to parse Dify output:', e);
      return [];
    }
  }

  /**
   * 调用 Dify Workflow 提取记忆
   */
  private async extractMemoriesFromDify(queries: string[], userId: string): Promise<MemoryItem[]> {
    if (!DIFY_BASE_URL || !DIFY_SUPER_AGENT_UTILS_API_KEY) {
      throw new Error('Dify configuration missing');
    }

    // 将多条 Query 拼接成一段文本
    const combinedInput = queries.join('\n');

    try {
      const response = await axios.post<DifyWorkflowResponse>(
        `${DIFY_BASE_URL}/workflows/run`,
        {
          inputs: {
            mode: 'generate_memory',
            input: combinedInput,
          },
          response_mode: 'blocking',
          user: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${DIFY_SUPER_AGENT_UTILS_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;

      if (data.status !== 'succeeded') {
        throw new Error(`Dify workflow failed: ${data.error || 'Unknown error'}`);
      }

      return this.parseDifyOutput(data.outputs.output);

    } catch (error) {
      console.error('[MemoryService] Dify API call failed:', error);
      throw error;
    }
  }
}

export const memoryService = new MemoryService();
