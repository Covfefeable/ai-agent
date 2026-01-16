import { FastifyInstance } from 'fastify';
import { chatController } from '../controllers/chat';

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/message', chatController.message);
  fastify.post('/upload', chatController.upload);
  fastify.get('/conversations', chatController.getConversations);
  fastify.delete('/conversations/:id', chatController.deleteConversation);
  fastify.get('/messages', chatController.getMessages);
  fastify.post('/messages/:message_id/feedbacks', chatController.feedback);
  fastify.post('/messages/:task_id/stop', chatController.stopGeneration);
}
