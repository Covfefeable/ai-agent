import { FastifyInstance } from 'fastify';
import { eventsController } from '../controllers/events';

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.post('/', eventsController.track);
}
