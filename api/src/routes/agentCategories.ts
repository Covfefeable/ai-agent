import { FastifyInstance } from 'fastify';
import { agentCategoryController } from '../controllers/agentCategories';

export async function agentCategoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', agentCategoryController.list);
  fastify.post('/', agentCategoryController.create);
  fastify.patch('/:id', agentCategoryController.update);
  fastify.delete('/:id', agentCategoryController.delete);
}
