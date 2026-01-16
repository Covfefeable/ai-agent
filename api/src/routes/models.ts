import { FastifyInstance } from 'fastify';
import { modelsController } from '../controllers/models';

export async function modelsRoutes(fastify: FastifyInstance) {
  fastify.get('/', modelsController.list);
  fastify.get('/:id', modelsController.get);
  fastify.post('/', modelsController.create);
  fastify.patch('/:id', modelsController.update);
  fastify.delete('/:id', modelsController.delete);
}
