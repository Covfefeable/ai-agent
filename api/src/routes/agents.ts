import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { db } from '../db';
import { agents, categories, users, agentUserGroups, userGroupMembers, userGroups } from '../db/schema';
import { eq, desc, ilike, or, and, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createUsageLogStream } from '../lib/usage';

async function fetchImageAsBase64(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(response.data);
    const mimeType = response.headers['content-type'] || 'image/png';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Failed to fetch icon image from ${url}:`, error);
    return null;
  }
}

async function verifyAgentAccess(agent: any, userId: string, userRole: string) {
  if (['owner', 'admin'].includes(userRole)) return true;
  if (agent.userId === userId) return true;
  if (agent.visibility === 'public') return true;

  if (agent.visibility === 'selected_groups') {
    const [match] = await db.select({ id: agentUserGroups.id })
      .from(agentUserGroups)
      .innerJoin(userGroupMembers, eq(agentUserGroups.groupId, userGroupMembers.groupId))
      .where(and(
        eq(agentUserGroups.agentId, agent.id),
        eq(userGroupMembers.userId, userId)
      ))
      .limit(1);
    return !!match;
  }
  
  return false;
}

export async function agentsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      const userId = request.user.id;
      
      const { keyword, page = 1, limit = 20 } = request.query as { keyword?: string; page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];

      // Access control: Admin/Owner see all, others see own
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(agents.userId, userId));
      }

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agents)
        .where(whereClause);
      const total = Number(countResult?.count || 0);

      // Get paginated data
      const list = await db.select({
        id: agents.id,
        title: agents.title,
        description: agents.description,
        iconUrl: agents.iconUrl,
        categoryId: agents.categoryId,
        multiplier: agents.multiplier,
        visibility: agents.visibility,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(whereClause)
      .orderBy(desc(agents.createdAt))
      .limit(limitNum)
      .offset(offset);

      // Fetch groups for selected_groups agents
      const agentIds = list.map(a => a.id);
      const agentGroupsMap: Record<string, string[]> = {};
      
      if (agentIds.length > 0) {
        const groups = await db.select({
          agentId: agentUserGroups.agentId,
          groupName: userGroups.name
        })
        .from(agentUserGroups)
        .innerJoin(userGroups, eq(agentUserGroups.groupId, userGroups.id))
        .where(inArray(agentUserGroups.agentId, agentIds));

        groups.forEach(g => {
            if (!agentGroupsMap[g.agentId]) {
                agentGroupsMap[g.agentId] = [];
            }
            agentGroupsMap[g.agentId].push(g.groupName);
        });
      }

      const listWithGroups = list.map(item => ({
        ...item,
        groups: agentGroupsMap[item.id]?.join(',') || undefined
      }));

      return { 
        data: listWithGroups,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agents error');
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  fastify.get('/public', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      const userId = request.user.id;
      const { keyword, categoryId, page = 1, limit = 20 } = request.query as { keyword?: string; categoryId?: string; page?: number; limit?: number };
      
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];

      // Access control: Admin/Owner see all, others see public OR own OR visible via group
      if (!['owner', 'admin'].includes(userRole)) {
        const userGroupsSubquery = db
          .select({ id: agentUserGroups.agentId })
          .from(agentUserGroups)
          .innerJoin(userGroupMembers, eq(agentUserGroups.groupId, userGroupMembers.groupId))
          .where(eq(userGroupMembers.userId, userId));

        conditions.push(or(
          eq(agents.userId, userId),
          eq(agents.visibility, 'public'),
          and(
            eq(agents.visibility, 'selected_groups'),
            inArray(agents.id, userGroupsSubquery)
          )
        ));
      }

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
      }
      
      if (categoryId) {
        conditions.push(eq(agents.categoryId, categoryId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agents)
        .where(whereClause);
      const total = Number(countResult?.count || 0);

      // Get paginated data
      const list = await db.select({
        id: agents.id,
        title: agents.title,
        description: agents.description,
        iconUrl: agents.iconUrl,
        categoryId: agents.categoryId,
        multiplier: agents.multiplier,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(whereClause)
      .orderBy(desc(agents.createdAt))
      .limit(limitNum)
      .offset(offset);

      return { 
        data: list,
        total,
        page: pageNum,
        limit: limitNum
      };
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
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
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

  fastify.get('/:id/conversations', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const { last_id, limit = 20 } = request.query as { last_id?: string; limit?: number };
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      
      const response = await axios.get(`${baseUrl}/conversations`, {
        params: {
          user: (request.user?.id ?? 'web').toString(),
          last_id,
          limit
        },
        headers: {
          Authorization: `Bearer ${row.apiKey}`,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agent conversations error');
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
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      // Check user balance if logged in
      let userRole = 'guest';
      const userId = request.user?.id;
      
      if (userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (dbUser) {
          userRole = dbUser.role;
          if (userRole === 'member' && dbUser.balance <= 0) {
            return reply.status(402).send({ message: '余额不足，请充值' });
          }
        }
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
      const logStream = createUsageLogStream((request.user?.id ?? 'web').toString(), userRole, id, row.multiplier);
      response.data.pipe(logStream);
      return logStream;
    } catch (error: any) {
      fastify.log.error({ error }, 'Chat messages proxy error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });


  fastify.delete('/:id/conversations/:conversationId', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const conversationId = request.params.conversationId as string;
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const user = (request.user?.id ?? 'web').toString();

      const response = await axios.delete(`${baseUrl}/conversations/${conversationId}`, {
        data: { user },
        headers: {
          Authorization: `Bearer ${row.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete agent conversation error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.get('/:id/messages', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const { conversation_id, first_id, limit = 20 } = request.query as { conversation_id: string; first_id?: string; limit?: number };
      
      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }
      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const user = (request.user?.id ?? 'web').toString();

      const response = await axios.get(`${baseUrl}/messages`, {
        params: {
          user,
          conversation_id,
          first_id,
          limit
        },
        headers: {
          Authorization: `Bearer ${row.apiKey}`,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Get agent messages error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.post('/:id/messages/:message_id/feedbacks', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const { message_id } = request.params as { message_id: string };
      const bodySchema = z.object({
        rating: z.enum(['like', 'dislike']).nullable(),
      });
      const { rating } = bodySchema.parse(request.body);

      const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      if (!row) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const baseUrl = row.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
      const user = (request.user?.id ?? 'web').toString();

      const response = await axios.post(
        `${baseUrl}/messages/${message_id}/feedbacks`,
        { rating, user },
        {
          headers: {
            Authorization: `Bearer ${row.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      fastify.log.error({ error }, 'Agent message feedback error');
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
      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
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
        visibility: z.enum(['public', 'private', 'selected_groups']).optional(),
        groupIds: z.array(z.string().uuid()).optional(),
        categoryId: z.string().uuid().optional(),
        multiplier: z.number().min(0).optional(),
      });
      const parsed = bodySchema.parse(request.body);
      const { apiKey, baseUrl: inputBaseUrl, categoryId, multiplier, groupIds } = parsed;
      
      let visibility = parsed.visibility;
      if (!visibility) visibility = 'public'; // Default

      // Validate visibility and groups
      if (visibility === 'selected_groups') {
        if (!groupIds || groupIds.length === 0) {
           return reply.status(400).send({ message: '请选择可见用户组' });
        }
        if (userRole === 'member') {
           // Check membership
           const members = await db.select().from(userGroupMembers).where(and(eq(userGroupMembers.userId, userId), inArray(userGroupMembers.groupId, groupIds)));
           if (members.length !== groupIds.length) {
              return reply.status(403).send({ message: '您只能选择自己加入的用户组' });
           }
        }
      }

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
      const iconBase64 = await fetchImageAsBase64(iconUrl);

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
        iconUrl: iconBase64 || iconUrl || null,
        visibility,
        categoryId: catId,
        multiplier: multiplier ?? 1.0,
      }).returning();

      if (visibility === 'selected_groups' && groupIds && groupIds.length > 0) {
        await db.insert(agentUserGroups).values(
          groupIds.map(groupId => ({
            agentId: created.id,
            groupId
          }))
        );
      }

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

      if (!(await verifyAgentAccess(row, request.user?.id, request.user?.role))) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      let groupIds: string[] = [];
      if (row.visibility === 'selected_groups') {
         const groups = await db.select({ groupId: agentUserGroups.groupId })
           .from(agentUserGroups)
           .where(eq(agentUserGroups.agentId, row.id));
         groupIds = groups.map(g => g.groupId);
      }

      return { data: { ...row, groupIds } };
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
        visibility: z.enum(['public', 'private', 'selected_groups']).optional(),
        groupIds: z.array(z.string().uuid()).optional(),
        categoryId: z.string().uuid().optional(),
        multiplier: z.number().min(0).optional(),
      });
      const parsed = bodySchema.safeParse(request.body || {});
      if (!parsed.success) return reply.status(400).send({ message: 'Invalid input', errors: parsed.error });

      const { apiKey: inputApiKey, baseUrl: inputBaseUrl, categoryId: inputCategoryId, multiplier: inputMultiplier, visibility: inputVisibility, groupIds: inputGroupIds } = parsed.data;

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

      // Determine new visibility
      let newVisibility = inputVisibility;

      if (newVisibility === 'selected_groups' && (!inputGroupIds && record.visibility !== 'selected_groups')) {
         return reply.status(400).send({ message: '请选择可见用户组' });
      }

      if (inputGroupIds && userRole === 'member') {
         const members = await db.select().from(userGroupMembers).where(and(eq(userGroupMembers.userId, request.user.id), inArray(userGroupMembers.groupId, inputGroupIds)));
         if (members.length !== inputGroupIds.length) {
            return reply.status(403).send({ message: '您只能选择自己加入的用户组' });
         }
      }

      if (!targetApiKey) {
        targetApiKey = record.apiKey;
      }
      if (targetBaseUrl === undefined) {
        targetBaseUrl = record.baseUrl || undefined;
      }

      let updateFields: Partial<{ title: string; description: string; iconUrl: string | null; visibility: string; categoryId: string | null; baseUrl: string | null; apiKey: string; multiplier: number }> = {};
      
      if (inputApiKey) {
        updateFields.apiKey = inputApiKey;
      }
      if (inputMultiplier !== undefined) {
        updateFields.multiplier = inputMultiplier;
      }
      if (inputBaseUrl !== undefined) {
        updateFields.baseUrl = inputBaseUrl || null;
      }
      if (newVisibility) {
        updateFields.visibility = newVisibility;
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
        const iconBase64 = await fetchImageAsBase64(iconUrl);

        Object.assign(updateFields, {
          title,
          description,
          iconUrl: iconBase64 || iconUrl || null,
        });
      }

      const [updated] = await db.update(agents)
        .set(updateFields)
        .where(eq(agents.id, id))
        .returning();

      if (inputGroupIds) {
        await db.transaction(async (tx) => {
           await tx.delete(agentUserGroups).where(eq(agentUserGroups.agentId, id));
           if (inputGroupIds.length > 0) {
             await tx.insert(agentUserGroups).values(inputGroupIds.map(gid => ({ agentId: id, groupId: gid })));
           }
        });
      }

      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update agent error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });
}
