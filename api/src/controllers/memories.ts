import { FastifyRequest, FastifyReply } from 'fastify';
import { memoryService } from '../services/memories';

export const memoriesController = {
  async getMemories(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const memories = await memoryService.getMemories(userId);
      return memories;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async deleteMemory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { id } = request.params as any;
      await memoryService.deleteMemory(userId, id);
      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateMemory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { id } = request.params as any;
      const { content } = request.body as any;
      
      if (!content || typeof content !== 'string') {
        return reply.status(400).send({ message: '内容不能为空' });
      }

      await memoryService.updateMemory(userId, id, content);
      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
