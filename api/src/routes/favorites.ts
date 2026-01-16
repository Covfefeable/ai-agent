import { FastifyInstance } from 'fastify';
import { favoritesController } from '../controllers/favorites';

export async function favoritesRoutes(fastify: FastifyInstance) {
  fastify.post('/', favoritesController.add);
  fastify.delete('/:agentId', favoritesController.remove);
  fastify.get('/:agentId/check', favoritesController.check);
  fastify.get('/', favoritesController.list);
}
