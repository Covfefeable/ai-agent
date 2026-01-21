import { Task } from 'graphile-worker';
import { memoryService } from '../../services/memory';

interface CompressUserMemoryPayload {
  userId: string;
}

const task: Task = async (payload) => {
  const { userId } = payload as CompressUserMemoryPayload;

  if (!userId) {
    console.error('[Worker] Missing userId in compress_user_memory payload');
    return;
  }

  console.log(`[Worker] Starting memory compression for user ${userId}`);
  
  try {
    await memoryService.compressUserMemories(userId);
  } catch (error) {
    console.error(`[Worker] Failed to compress memories for user ${userId}:`, error);
    throw error;
  }
};

export default task;
