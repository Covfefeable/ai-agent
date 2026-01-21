import { FastifyInstance } from 'fastify';
import { memoriesController } from '../controllers/memories';

export async function memoriesRoutes(fastify: FastifyInstance) {
  // Get user memories
  fastify.get('/', memoriesController.getMemories);

  // Delete user memory
  fastify.delete('/:id', memoriesController.deleteMemory);

  // Update user memory
  fastify.patch('/:id', memoriesController.updateMemory);
}
