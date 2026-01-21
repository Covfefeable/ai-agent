import { run, TaskList } from 'graphile-worker';
import { deleteFile, deleteFiles } from '../lib/minio';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface DeleteFilePayload {
  paths: string[];
}

const taskList: TaskList = {
  // Task: Delete files from MinIO
  delete_minio_files: async (payload: unknown) => {
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
  },
};

async function main() {
  const connectionString = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DB_HOST || 'db'}:5432/${process.env.POSTGRES_DB}`;

  console.log('[Worker] Starting worker...');
  
  const runner = await run({
    connectionString,
    concurrency: 5,
    noHandleSignals: false,
    pollInterval: 1000,
    taskList,
  });

  console.log('[Worker] Worker started successfully');
  
  await runner.promise;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Worker] Fatal error:', err);
    process.exit(1);
  });
}
