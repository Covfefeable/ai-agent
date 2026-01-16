import { FastifyInstance } from 'fastify';
import { analyticsController } from '../controllers/analytics';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/summary', analyticsController.getSummary);
  fastify.get('/stats', analyticsController.getStats);
}
