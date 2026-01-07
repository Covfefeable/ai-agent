import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { categories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export async function agentCategoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const list = await db.select().from(categories).orderBy(desc(categories.createdAt));
      return { data: list };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get categories error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const bodySchema = z.object({ name: z.string().min(1) });
      const { name } = bodySchema.parse(request.body);
      const [created] = await db.insert(categories).values({ name }).returning();
      return { data: created };
    } catch (error: any) {
      fastify.log.error({ error }, 'Create category error');
      reply.status(500).send({ message: error?.response?.data?.message || 'Internal Server Error' });
    }
  });

  fastify.patch('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const { id } = request.params as { id: string };
      const bodySchema = z.object({ name: z.string().min(1) });
      const { name } = bodySchema.parse(request.body);
      const [updated] = await db.update(categories).set({ name }).where(eq(categories.id, id)).returning();
      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update category error');
      reply.status(500).send({ message: error?.response?.data?.message || 'Internal Server Error' });
    }
  });

  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const { id } = request.params as { id: string };
      await db.delete(categories).where(eq(categories.id, id));
      return { message: 'Deleted' };
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete category error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
