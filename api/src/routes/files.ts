import { FastifyInstance } from 'fastify';
import { filesController } from '../controllers/files';

export async function filesRoutes(fastify: FastifyInstance) {
  fastify.get('/*', filesController.getFile);
}
