import { quickAddJob, TaskSpec } from 'graphile-worker';

/**
 * Adds a background job to the queue.
 * This is a wrapper around graphile-worker's quickAddJob to centralize DB connection logic.
 */
export async function addBackgroundJob(identifier: string, payload: unknown, spec?: TaskSpec) {
  return quickAddJob({ connectionString: process.env.DATABASE_URL || '' }, identifier, payload, spec);
}
