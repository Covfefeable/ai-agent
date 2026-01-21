import { run, TaskList } from 'graphile-worker';
import process_memory_buffer from './tasks/process_memory_buffer';
import delete_minio_files from './tasks/delete_minio_files';
import compress_user_memory from './tasks/compress_user_memory';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const taskList: TaskList = {
  // Task: Delete files from MinIO
  delete_minio_files,

  // Task: Process memory buffer
  process_memory_buffer,

  // Task: Compress user memory
  compress_user_memory,
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
