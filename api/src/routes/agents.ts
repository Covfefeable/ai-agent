import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { db } from '../db';
import { agents, categories } from '../db/schema';
import { eq, desc, ilike, or, and } from 'drizzle-orm';
import { z } from 'zod';

export async function agentsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      const userId = request.user.id;
      
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

      const conditions = [];

      // Access control: Admin/Owner see all, others see own
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(agents.userId, userId));
      }

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
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
      const userRole = request.user.role;
      const userId = request.user.id;
      const { keyword, categoryId } = request.query as { keyword?: string; categoryId?: string };
      
      let baseQuery = db.select({
        id: agents.id,
        title: agents.title,
        description: agents.description,
        iconUrl: agents.iconUrl,
        isPublic: agents.isPublic,
        categoryId: agents.categoryId,
        createdAt: agents.createdAt,
      }).from(agents).$dynamic();

      const conditions = [];

      // Access control: Admin/Owner see all, others see public OR own
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(or(eq(agents.isPublic, true), eq(agents.userId, userId)));
      }

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
      }
      
      if (categoryId) {
        conditions.push(eq(agents.categoryId, categoryId));
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const list = await baseQuery.orderBy(desc(agents.createdAt));
      return { data: list };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get public agents error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.get('/:id/parameters', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!row.isPublic) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const resp = await axios.get(`${baseUrl}/parameters`, {
        headers: {
          Authorization: `Bearer ${row.apiKey}`,
        },
        timeout: 10000,
      });
      return resp.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agent parameters error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.post('/:id/chat-messages', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!row.isPublic) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const body = request.body || {};
      const response_mode = 'streaming';
      const payload = {
        inputs: body?.inputs ?? {},
        query: body?.query,
        files: Array.isArray(body?.files) ? body.files : [],
        conversation_id: body?.conversation_id,
        response_mode,
        user: (request.user?.id ?? 'web').toString(),
        auto_generate_name: true,
      };
      if (!payload.query) {
        return reply.status(400).send({ message: 'query is required' });
      }
      const response = await axios.post(
        `${baseUrl}/chat-messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${row.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      return response.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Chat messages proxy error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.post('/:id/files/upload', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!row.isPublic) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: 'No file uploaded' });
      }
      const buffer = await data.toBuffer();
      const blob = new Blob([buffer], { type: data.mimetype });
      const form = new FormData();
      form.append('file', blob, data.filename);
      form.append('user', (request.user?.id ?? 'web').toString());
      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const resp = await axios.post(`${baseUrl}/files/upload`, form, {
        headers: {
          Authorization: `Bearer ${row.apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return resp.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Agent file upload error');
      reply.status(500).send({ message: 'Upload failed' });
    }
  });
  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      const userId = request.user.id;
      // Access control: Anyone logged in can create
      
      const bodySchema = z.object({
        apiKey: z.string().min(1),
        baseUrl: z.string().optional(),
        isPublic: z.boolean().optional(),
        categoryId: z.string().uuid().optional(),
      });
      const { apiKey, baseUrl: inputBaseUrl, isPublic, categoryId } = bodySchema.parse(request.body);

      const baseUrl = inputBaseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
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
        baseUrl: inputBaseUrl || null,
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
      const id = request.params.id as string;
      
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      if (!['owner', 'admin'].includes(userRole)) {
        if (row.userId !== request.user.id) {
          return reply.status(403).send({ message: 'Forbidden' });
        }
      }

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
      const id = request.params.id as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      if (!['owner', 'admin'].includes(userRole)) {
        if (row.userId !== request.user.id) {
           return reply.status(403).send({ message: 'Forbidden' });
        }
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
      const id = request.params.id as string;
      const bodySchema = z.object({
        apiKey: z.string().min(1).optional(),
        baseUrl: z.string().optional(),
        isPublic: z.boolean().optional(),
        categoryId: z.string().uuid().optional(),
      });
      const parsed = bodySchema.safeParse(request.body || {});
      const inputApiKey = parsed.success ? parsed.data.apiKey : undefined;
      const inputBaseUrl = parsed.success ? parsed.data.baseUrl : undefined;
      const inputIsPublic = parsed.success ? parsed.data.isPublic : undefined;
      const inputCategoryId = parsed.success ? parsed.data.categoryId : undefined;

      let targetApiKey = inputApiKey;
      let targetBaseUrl = inputBaseUrl;

      // Check DB if needed
      const [record] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!record) {
         return reply.status(404).send({ message: 'Not Found' });
      }

      if (!['owner', 'admin'].includes(userRole)) {
        if (record.userId !== request.user.id) {
           return reply.status(403).send({ message: 'Forbidden' });
        }
      }

      if (!targetApiKey) {
        targetApiKey = record.apiKey;
      }
      if (targetBaseUrl === undefined) {
        targetBaseUrl = record.baseUrl || undefined;
      }

      let updateFields: Partial<{ title: string; description: string; iconUrl: string | null; isPublic: boolean; categoryId: string | null; baseUrl: string | null; apiKey: string }> = {};
      
      if (inputApiKey) {
        updateFields.apiKey = inputApiKey;
      }
      if (inputBaseUrl !== undefined) {
        updateFields.baseUrl = inputBaseUrl || null;
      }
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
        const verifyUrl = targetBaseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
        const resp = await axios.get(`${verifyUrl}/site`, {
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

        Object.assign(updateFields, {
          title,
          description,
          iconUrl: iconUrl || null,
        });
      }

      const [updated] = await db.update(agents)
        .set(updateFields)
        .where(eq(agents.id, id))
        .returning();
      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update agent error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });
}
