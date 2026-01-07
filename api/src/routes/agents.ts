import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { db } from '../db';
import { agents, categories } from '../db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

export async function agentsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const { keyword } = request.query as { keyword?: string };

      let baseQuery = db.select({
        id: agents.id,
        title: agents.title,
        description: agents.description,
        iconUrl: agents.iconUrl,
        isPublic: agents.isPublic,
        categoryId: agents.categoryId,
        createdAt: agents.createdAt,
      }).from(agents).$dynamic();
      if (keyword) {
        const k = `%${keyword}%`;
        baseQuery = baseQuery.where(or(ilike(agents.title, k), ilike(agents.description, k)));
      }
      const list = await baseQuery.orderBy(desc(agents.createdAt));
      return { data: list };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agents error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.get('/public', async (request: any, reply) => {
    try {
      const { keyword, categoryId } = request.query as { keyword?: string; categoryId?: string };
      let baseQuery = db.select({
        id: agents.id,
        title: agents.title,
        description: agents.description,
        iconUrl: agents.iconUrl,
        isPublic: agents.isPublic,
        categoryId: agents.categoryId,
        createdAt: agents.createdAt,
      }).from(agents).where(eq(agents.isPublic, true)).$dynamic();
      if (keyword) {
        const k = `%${keyword}%`;
        baseQuery = baseQuery.where(or(ilike(agents.title, k), ilike(agents.description, k)));
      }
      if (categoryId) {
        baseQuery = baseQuery.where(eq(agents.categoryId, categoryId));
      }
      const list = await baseQuery.orderBy(desc(agents.createdAt));
      return { data: list };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get public agents error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      const userId = request.user.id;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const bodySchema = z.object({
        apiKey: z.string().min(1),
        isPublic: z.boolean().optional(),
        categoryId: z.string().uuid().optional(),
      });
      const { apiKey, isPublic, categoryId } = bodySchema.parse(request.body);

      const baseUrl = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const resp = await axios.get(`${baseUrl}/site`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      });

      const data = resp.data || {};
      const title: string = data.title || '未命名智能体';
      const description: string = data.description || '';
      const iconType: string = data.icon_type || 'emoji';
      const iconUrl: string | null = iconType === 'image' ? (data.icon_url || null) : null;

      // validate category if provided
      let catId: string | undefined = categoryId;
      if (catId) {
        const [cat] = await db.select().from(categories).where(eq(categories.id, catId)).limit(1);
        if (!cat) {
          return reply.status(400).send({ message: '分类不存在' });
        }
      }

      const [created] = await db.insert(agents).values({
        userId,
        title,
        description,
        apiKey,
        iconUrl: iconUrl || null,
        isPublic: !!isPublic,
        categoryId: catId,
      }).returning();

      return { data: created };
    } catch (error: any) {
      fastify.log.error({ error }, 'Create agent error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const id = request.params.id as string;
      await db.delete(agents).where(eq(agents.id, id));
      return { message: 'Deleted' };
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete agent error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.get('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const id = request.params.id as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      return { data: row };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agent detail error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.patch('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const id = request.params.id as string;
      const bodySchema = z.object({
        apiKey: z.string().min(1).optional(),
        isPublic: z.boolean().optional(),
        categoryId: z.string().uuid().optional(),
      });
      const parsed = bodySchema.safeParse(request.body || {});
      const inputApiKey = parsed.success ? parsed.data.apiKey : undefined;
      const inputIsPublic = parsed.success ? parsed.data.isPublic : undefined;
      const inputCategoryId = parsed.success ? parsed.data.categoryId : undefined;

      let targetApiKey = inputApiKey;
      if (!targetApiKey) {
        const [record] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
        if (record?.apiKey) {
          targetApiKey = record.apiKey as string;
        }
      }

      let updateFields: Partial<{ title: string; description: string; iconUrl: string | null; isPublic: boolean; categoryId: string | null }> = {};
      if (typeof inputIsPublic === 'boolean') {
        updateFields.isPublic = inputIsPublic;
      }
      if (typeof inputCategoryId === 'string') {
        if (inputCategoryId) {
          const [cat] = await db.select().from(categories).where(eq(categories.id, inputCategoryId)).limit(1);
          if (!cat) {
            return reply.status(400).send({ message: '分类不存在' });
          }
          updateFields.categoryId = inputCategoryId;
        } else {
          updateFields.categoryId = null;
        }
      }

      if (targetApiKey) {
        const baseUrl = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
        const resp = await axios.get(`${baseUrl}/site`, {
          headers: {
            Authorization: `Bearer ${targetApiKey}`,
          },
          timeout: 10000,
        });

        const data = resp.data || {};
        const title: string = data.title || '未命名智能体';
        const description: string = data.description || '';
        const iconType: string = data.icon_type || 'emoji';
        const iconUrl: string | null = iconType === 'image' ? (data.icon_url || null) : null;

      const [updated] = await db.update(agents)
        .set({
          ...updateFields,
          title,
          description,
          iconUrl: iconUrl || null,
        })
        .where(eq(agents.id, id))
        .returning();
      return { data: updated };
      } else {
        const [updated] = await db.update(agents)
          .set(updateFields)
          .where(eq(agents.id, id))
          .returning();
        return { data: updated };
      }
    } catch (error: any) {
      fastify.log.error({ error }, 'Update agent error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });
}
