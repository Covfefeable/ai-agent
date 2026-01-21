import { Task } from 'graphile-worker';
import { memoryService } from '../../services/memories';

interface ProcessMemoryBufferPayload {
  bufferId: string;
}

const task: Task = async (payload) => {
  const { bufferId } = payload as ProcessMemoryBufferPayload;
  await memoryService.processBuffer(bufferId);
};

export default task;
