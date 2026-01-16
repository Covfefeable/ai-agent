import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { modelsService } from '../services/models';

const createModelSchema = z.object({
  name: z.string().min(1),
  modelId: z.string().min(1),
  sort: z.number().optional().default(0),
  enabled: z.boolean().optional().default(true),
  iconUrl: z.string().optional(),
  multiplier: z.number().min(0).default(1.0),
  visibility: z.enum(['public', 'selected_groups']).default('public'),
  groupIds: z.array(z.string()).optional(),
});

const updateModelSchema = z.object({
  name: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  sort: z.number().optional(),
  enabled: z.boolean().optional(),
  iconUrl: z.string().optional(),
  multiplier: z.number().min(0).optional(),
  visibility: z.enum(['public', 'private', 'selected_groups']).optional(),
  groupIds: z.array(z.string()).optional(),
});

export const modelsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      const result = await modelsService.listModels(user, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const user = (request as any).user;
      const result = await modelsService.getModel(id, user);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '模型不存在') {
        return reply.status(404).send({ message: error.message });
      }
      if (error.message === '无权限') {
        return reply.status(403).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request as any).user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const body = createModelSchema.parse(request.body);
      const result = await modelsService.createModel(body);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '输入无效', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '模型ID已存在') {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request as any).user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const id = (request.params as any).id;
      const body = updateModelSchema.parse(request.body);
      
      const result = await modelsService.updateModel(id, body);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '输入无效', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '模型不存在') {
        return reply.status(404).send({ message: error.message });
      }
      if (error.message === '模型ID已存在') {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request as any).user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const id = (request.params as any).id;
      const result = await modelsService.deleteModel(id);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '模型不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
