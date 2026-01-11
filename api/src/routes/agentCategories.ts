import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { categories } from '../db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

export async function agentCategoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply) => {
    try {
      const list = await db.select().from(categories).orderBy(asc(categories.sort), desc(categories.createdAt));
      return { data: list };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get categories error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }
      const bodySchema = z.object({ 
        name: z.string().min(1),
        sort: z.number().int().default(0).optional()
      });
      const { name, sort } = bodySchema.parse(request.body);
      const [created] = await db.insert(categories).values({ name, sort: sort || 0 }).returning();
      return { data: created };
    } catch (error: any) {
      fastify.log.error({ error }, 'Create category error');
      reply.status(500).send({ message: error?.response?.data?.message || '服务器内部错误' });
    }
  });

  fastify.patch('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
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

      const [updated] = await db.update(categories).set(updateData).where(eq(categories.id, id)).returning();
      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update category error');
      reply.status(500).send({ message: error?.response?.data?.message || '服务器内部错误' });
    }
  });

  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }
      const { id } = request.params as { id: string };
      await db.delete(categories).where(eq(categories.id, id));
      return { message: '已删除' };
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete category error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });
}
