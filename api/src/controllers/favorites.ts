import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { favoritesService } from '../services/favorites';

const addFavoriteSchema = z.object({
  agentId: z.string().uuid(),
});

const paramsSchema = z.object({
  agentId: z.string().uuid(),
});

export const favoritesController = {
  async add(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { agentId } = addFavoriteSchema.parse(request.body);
      const userId = (request as any).user.id;

      const result = await favoritesService.add(userId, agentId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { agentId } = paramsSchema.parse(request.params);
      const userId = (request as any).user.id;

      const result = await favoritesService.remove(userId, agentId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async check(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { agentId } = paramsSchema.parse(request.params);
      const userId = (request as any).user.id;

      const result = await favoritesService.check(userId, agentId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;

      const result = await favoritesService.list(userId);
      return result;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
