import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { models } from '../db/schema';
import { eq, desc, ilike, or, and, sql, asc } from 'drizzle-orm';
import { z } from 'zod';

export async function modelsRoutes(fastify: FastifyInstance) {
  // Get models list
  fastify.get('/', async (request: any, reply) => {
    try {
      const { keyword, page = 1, limit = 20 } = request.query as { keyword?: string; page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(models.name, k), ilike(models.modelId, k)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(models)
        .where(whereClause);
      const total = Number(countResult?.count || 0);

      // Get paginated data
      const list = await db.select()
        .from(models)
        .where(whereClause)
        .orderBy(asc(models.sort), desc(models.createdAt))
        .limit(limitNum)
        .offset(offset);

      return { 
        data: list,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get models error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Get single model
  fastify.get('/:id', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const [row] = await db.select().from(models).where(eq(models.id, id)).limit(1);
      
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      return { data: row };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get model detail error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Create model
  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const bodySchema = z.object({
        name: z.string().min(1),
        modelId: z.string().min(1),
        sort: z.number().optional().default(0),
        enabled: z.boolean().optional().default(true),
        iconUrl: z.string().optional(),
      });

      const data = bodySchema.parse(request.body);

      // Check if modelId exists
      const [existing] = await db.select().from(models).where(eq(models.modelId, data.modelId)).limit(1);
      if (existing) {
        return reply.status(400).send({ message: '模型ID已存在' });
      }

      const [created] = await db.insert(models).values({
        name: data.name,
        modelId: data.modelId,
        sort: data.sort,
        enabled: data.enabled,
        iconUrl: data.iconUrl || null,
      }).returning();

      return { data: created };
    } catch (error: any) {
      fastify.log.error({ error }, 'Create model error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Invalid input', errors: error.issues });
      }
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update model
  fastify.patch('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const id = request.params.id as string;
      const bodySchema = z.object({
        name: z.string().min(1).optional(),
        modelId: z.string().min(1).optional(),
        sort: z.number().optional(),
        enabled: z.boolean().optional(),
        iconUrl: z.string().optional(),
      });

      const data = bodySchema.parse(request.body);

      const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
      if (!existing) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      if (data.modelId && data.modelId !== existing.modelId) {
        const [dup] = await db.select().from(models).where(eq(models.modelId, data.modelId)).limit(1);
        if (dup) {
          return reply.status(400).send({ message: '模型ID已存在' });
        }
      }

      const [updated] = await db.update(models)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(models.id, id))
        .returning();

      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update model error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Invalid input', errors: error.issues });
      }
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Delete model
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const id = request.params.id as string;
      
      const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
      if (!existing) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      await db.delete(models).where(eq(models.id, id));
      return { message: 'Deleted' };
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete model error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
