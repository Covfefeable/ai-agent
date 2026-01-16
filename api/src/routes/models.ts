import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { models, modelUserGroups, userGroupMembers, userGroups } from '../db/schema';
import { eq, desc, ilike, or, and, sql, asc, inArray } from 'drizzle-orm';
import { z } from 'zod';

export async function modelsRoutes(fastify: FastifyInstance) {
  // Get models list
  fastify.get('/', async (request: any, reply) => {
    try {
      const { keyword, page = 1, limit = 20 } = request.query as { keyword?: string; page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      const user = request.user;

      const conditions = [];

      if (keyword) {
        const k = `%${keyword}%`;
        conditions.push(or(ilike(models.name, k), ilike(models.modelId, k)));
      }

      // Visibility filter for non-admin users
      if (!['owner', 'admin'].includes(user.role)) {
        // Get user's groups
        const userGroupsList = await db
          .select({ groupId: userGroupMembers.groupId })
          .from(userGroupMembers)
          .where(eq(userGroupMembers.userId, user.id));
        
        const groupIds = userGroupsList.map(g => g.groupId);

        // Filter: public OR (selected_groups AND model_id IN (allowed_models))
        // Since we can't easily do subqueries in complex ORs with Drizzle sometimes, 
        // let's fetch allowed private models first if user has groups.
        
        let allowedModelIds: string[] = [];
        if (groupIds.length > 0) {
          const allowed = await db
            .select({ modelId: modelUserGroups.modelId })
            .from(modelUserGroups)
            .where(inArray(modelUserGroups.groupId, groupIds));
          allowedModelIds = allowed.map(m => m.modelId);
        }

        if (allowedModelIds.length > 0) {
           conditions.push(
            or(
              eq(models.visibility, 'public'),
              and(
                eq(models.visibility, 'selected_groups'),
                inArray(models.id, allowedModelIds)
              )
            )
          );
        } else {
          conditions.push(eq(models.visibility, 'public'));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(models)
        .where(whereClause);
      const total = Number(countResult?.count || 0);

      // Get paginated data
      const list = await db.query.models.findMany({
        where: whereClause,
        limit: limitNum,
        offset: offset,
        orderBy: [asc(models.sort), desc(models.createdAt)],
        with: {
          groups: {
            with: {
              group: true
            }
          }
        }
      });

      const listWithGroups = list.map(model => ({
        ...model,
        groupIds: model.groups?.map((g: any) => g.groupId) || [],
        groups: model.groups?.map((g: any) => g.group.name).join(',') || undefined
      }));

      return { 
        data: listWithGroups,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get models error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Get single model
  fastify.get('/:id', async (request: any, reply) => {
    try {
      const id = request.params.id as string;
      const userRole = request.user.role;
      const userId = request.user.id;

      const row = await db.query.models.findFirst({
        where: eq(models.id, id),
        with: {
          groups: true
        }
      });
      
      if (!row) {
        return reply.status(404).send({ message: '模型不存在' });
      }

      // Access control
      if (!['owner', 'admin'].includes(userRole)) {
        if (row.visibility === 'private') {
           return reply.status(403).send({ message: '无权限' });
        }
        if (row.visibility === 'selected_groups') {
           const allowedGroupIds = row.groups.map((g: any) => g.groupId);
           if (allowedGroupIds.length === 0) return reply.status(403).send({ message: '无权限' });

           const [match] = await db.select({ id: userGroupMembers.id })
             .from(userGroupMembers)
             .where(and(
               eq(userGroupMembers.userId, userId),
               inArray(userGroupMembers.groupId, allowedGroupIds)
             ))
             .limit(1);

           if (!match) {
             return reply.status(403).send({ message: '无权限' });
           }
        }
      }

      let groupIds: string[] = [];
      if (row.visibility === 'selected_groups') {
        groupIds = row.groups.map((g: any) => g.groupId);
      }

      const { groups, ...rest } = row;
      return { data: { ...rest, groupIds } };
    } catch (error: any) {
      fastify.log.error({ error }, 'Get model detail error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Create model
  fastify.post('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const bodySchema = z.object({
        name: z.string().min(1),
        modelId: z.string().min(1),
        sort: z.number().optional().default(0),
        enabled: z.boolean().optional().default(true),
        iconUrl: z.string().optional(),
        multiplier: z.number().min(0).default(1.0),
        visibility: z.enum(['public', 'selected_groups']).default('public'),
        groupIds: z.array(z.string()).optional(),
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
        multiplier: data.multiplier,
        visibility: data.visibility,
      }).returning();

      if (data.visibility === 'selected_groups' && data.groupIds && data.groupIds.length > 0) {
        await db.insert(modelUserGroups).values(
          data.groupIds.map(groupId => ({
            modelId: created.id,
            groupId,
          }))
        );
      }

      return { data: created };
    } catch (error: any) {
      fastify.log.error({ error }, 'Create model error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '输入无效', errors: error.issues });
      }
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Update model
  fastify.patch('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const id = request.params.id as string;
      const bodySchema = z.object({
        name: z.string().min(1).optional(),
        modelId: z.string().min(1).optional(),
        sort: z.number().optional(),
        enabled: z.boolean().optional(),
        iconUrl: z.string().optional(),
        multiplier: z.number().min(0).optional(),
        visibility: z.enum(['public', 'private', 'selected_groups']).optional(),
        groupIds: z.array(z.string()).optional(),
      });

      const data = bodySchema.parse(request.body);

      const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
      if (!existing) {
        return reply.status(404).send({ message: '模型不存在' });
      }

      if (data.modelId && data.modelId !== existing.modelId) {
        const [dup] = await db.select().from(models).where(eq(models.modelId, data.modelId)).limit(1);
        if (dup) {
          return reply.status(400).send({ message: '模型ID已存在' });
        }
      }

      // Prepare update data, excluding groupIds
      const { groupIds, ...updateData } = data;

      const [updated] = await db.update(models)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(models.id, id))
        .returning();

      // Handle group relations if visibility or groupIds provided
      if (data.visibility !== undefined || data.groupIds !== undefined) {
        const newVisibility = data.visibility ?? existing.visibility;
        
        // Always clear existing relations first if we are updating groups or switching to public/private
        if (newVisibility === 'public' || newVisibility === 'private') {
           await db.delete(modelUserGroups).where(eq(modelUserGroups.modelId, id));
        } else if (newVisibility === 'selected_groups' && data.groupIds) {
           // Replace groups
           await db.delete(modelUserGroups).where(eq(modelUserGroups.modelId, id));
           if (data.groupIds.length > 0) {
             await db.insert(modelUserGroups).values(
               data.groupIds.map(groupId => ({
                 modelId: id,
                 groupId,
               }))
             );
           }
        }
      }

      return { data: updated };
    } catch (error: any) {
      fastify.log.error({ error }, 'Update model error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '输入无效', errors: error.issues });
      }
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Delete model
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const id = request.params.id as string;
      
      const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
      if (!existing) {
        return reply.status(404).send({ message: '模型不存在' });
      }

      await db.delete(models).where(eq(models.id, id));
      return { message: '已删除' };
    } catch (error: any) {
      fastify.log.error({ error }, 'Delete model error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });
}
