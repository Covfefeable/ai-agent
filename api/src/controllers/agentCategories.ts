import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { agentCategoryService } from '../services/agentCategories';

export const agentCategoryController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const list = await agentCategoryService.list();
      return { data: list };
    } catch (error: any) {
      request.log.error({ error }, 'Get categories error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }
      const bodySchema = z.object({ 
        name: z.string().min(1),
        sort: z.number().int().default(0).optional()
      });
      const { name, sort } = bodySchema.parse(request.body);
      const created = await agentCategoryService.create({ name, sort });
      return { data: created };
    } catch (error: any) {
      request.log.error({ error }, 'Create category error');
      reply.status(500).send({ message: error?.response?.data?.message || '服务器内部错误' });
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }
      const { id } = request.params as { id: string };
      const bodySchema = z.object({ 
        name: z.string().min(1).optional(),
        sort: z.number().int().optional()
      });
      const { name, sort } = bodySchema.parse(request.body);
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (sort !== undefined) updateData.sort = sort;

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ message: '无更新数据' });
      }

      const updated = await agentCategoryService.update(id, updateData);
      return { data: updated };
    } catch (error: any) {
      request.log.error({ error }, 'Update category error');
      reply.status(500).send({ message: error?.response?.data?.message || '服务器内部错误' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }
      const { id } = request.params as { id: string };
      await agentCategoryService.delete(id);
      return { message: '已删除' };
    } catch (error: any) {
      request.log.error({ error }, 'Delete category error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
