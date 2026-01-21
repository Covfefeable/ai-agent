import { Task } from 'graphile-worker';
import { deleteFiles } from '../../lib/minio';

interface DeleteFilePayload {
  paths: string[];
}

const task: Task = async (payload) => {
  const { paths } = payload as DeleteFilePayload;
  if (!paths || paths.length === 0) return;

  console.log(`[Worker] Deleting ${paths.length} files from MinIO:`, paths);
  
  // Use deleteFiles for bulk deletion
  try {
      await deleteFiles(paths);
      console.log(`[Worker] Successfully deleted files.`);
  } catch (error) {
      console.error(`[Worker] Failed to delete files:`, error);
      // Throwing error will cause the job to retry
      throw error;
  }
};

export default task;
