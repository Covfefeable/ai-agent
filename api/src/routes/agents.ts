import { FastifyInstance } from 'fastify';
import { agentController } from '../controllers/agents';

export async function agentsRoutes(fastify: FastifyInstance) {
  // Agent CRUD and Lists
  fastify.get('/', agentController.list);
  fastify.get('/public', agentController.listPublic);
  fastify.get('/:id', agentController.get);
  fastify.post('/', agentController.create);
  fastify.patch('/:id', agentController.update);
  fastify.delete('/:id', agentController.delete);

  // Dify Proxy Endpoints
  fastify.get('/:id/parameters', agentController.getParameters);
  fastify.get('/:id/conversations', agentController.getConversations);
  fastify.post('/:id/chat-messages', agentController.chatMessages);
  fastify.delete('/:id/conversations/:conversationId', agentController.deleteConversation);
  fastify.get('/:id/messages', agentController.getMessages);
  fastify.post('/:id/messages/:message_id/feedbacks', agentController.feedbackMessage);
  fastify.post('/:id/files/upload', agentController.uploadFile);
}
