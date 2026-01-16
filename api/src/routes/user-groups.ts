import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users, userGroups, userGroupMembers } from '../db/schema';
import { eq, desc, ilike, sql, and, inArray, or } from 'drizzle-orm';
import { z } from 'zod';

export async function userGroupsRoutes(fastify: FastifyInstance) {
  // Check auth for all routes
  fastify.addHook('preHandler', async (request: any, reply) => {
    const userRole = request.user?.role;
    if (!['owner', 'admin'].includes(userRole)) {
      return reply.status(403).send({ message: '无权访问' });
    }
  });

  // Get user groups list
  fastify.get('/', async (request: any, reply) => {
    try {
      const { page = 1, limit = 20, keyword } = request.query as { page?: number; limit?: number; keyword?: string };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      let conditions = undefined;
      if (keyword) {
        conditions = ilike(userGroups.name, `%${keyword}%`);
      }

      // Get groups with user count
      const list = await db.query.userGroups.findMany({
        where: conditions,
        limit: limitNum,
        offset: offset,
        orderBy: desc(userGroups.createdAt),
        extras: {
          userCount: sql<number>`(
            SELECT count(*) 
            FROM ${userGroupMembers} 
            WHERE ${userGroupMembers.groupId} = ${userGroups.id}
          )`.mapWith(Number).as('user_count')
        }
      });

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userGroups)
        .where(conditions);
      const total = Number(countResult?.count || 0);

      return {
        data: list,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get User Groups Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Create user group
  fastify.post('/', async (request: any, reply) => {
    try {
      const schema = z.object({
        name: z.string().min(1, '请输入用户组名称'),
      });
      const { name } = schema.parse(request.body);

      const [group] = await db.insert(userGroups).values({ name }).returning();

      return group;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      console.error('Create User Group Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Update user group
  fastify.put('/:id', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        name: z.string().min(1, '请输入用户组名称'),
      });
      const { name } = schema.parse(request.body);

      const [group] = await db
        .update(userGroups)
        .set({ name })
        .where(eq(userGroups.id, id))
        .returning();

      if (!group) {
        return reply.status(404).send({ message: '用户组不存在' });
      }

      return group;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      console.error('Update User Group Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Delete user group
  fastify.delete('/:id', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Delete members first
      await db.delete(userGroupMembers).where(eq(userGroupMembers.groupId, id));

      // Delete group
      const [group] = await db.delete(userGroups).where(eq(userGroups.id, id)).returning();

      if (!group) {
        return reply.status(404).send({ message: '用户组不存在' });
      }

      return { message: '用户组删除成功' };
    } catch (error) {
      console.error('Delete User Group Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Get users with membership status for a group
  fastify.get('/:id/users', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20, keyword } = request.query as { page?: number; limit?: number; keyword?: string };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      let conditions = undefined;
      if (keyword) {
        conditions = or(ilike(users.name, `%${keyword}%`), ilike(users.email, `%${keyword}%`));
      }

      // We need to fetch users and check if they are in the group
      // Join users with userGroupMembers where groupId = id
      
      const list = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          createdAt: users.createdAt,
          isMember: sql<boolean>`CASE WHEN ${userGroupMembers.id} IS NOT NULL THEN true ELSE false END`,
          groups: sql<string>`(
            SELECT string_agg(ug.name, ',')
            FROM ${userGroupMembers} ugm
            JOIN ${userGroups} ug ON ug.id = ugm.group_id
            WHERE ugm.user_id = "users"."id"
          )`.as('groups'),
        })
        .from(users)
        .leftJoin(userGroupMembers, and(eq(users.id, userGroupMembers.userId), eq(userGroupMembers.groupId, id)))
        .where(conditions)
        .orderBy(desc(users.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions);
      const total = Number(countResult?.count || 0);

      return {
        data: list,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get Group Users Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Add users to group
  fastify.post('/:id/users', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        userIds: z.array(z.string().uuid()),
      });
      const { userIds } = schema.parse(request.body);

      if (userIds.length === 0) {
        return { message: '未选择用户' };
      }

      // Check if group exists
      const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
      if (!group) {
        return reply.status(404).send({ message: '用户组不存在' });
      }

      // Filter out users already in the group to avoid duplicate key errors
      // Although `onConflict` could work, let's just insert valid ones
      // Actually `insert ... on conflict do nothing` is better
      
      const values = userIds.map(userId => ({
        userId,
        groupId: id,
      }));

      await db.insert(userGroupMembers)
        .values(values)
        .onConflictDoNothing()
        .execute();

      return { message: '用户添加成功' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      console.error('Add Group Users Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Batch update users in group (add and remove)
  fastify.put('/:id/users', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        add: z.array(z.string().uuid()).default([]),
        remove: z.array(z.string().uuid()).default([]),
      });
      const { add, remove } = schema.parse(request.body);

      if (add.length === 0 && remove.length === 0) {
        return { message: '无变更' };
      }

      await db.transaction(async (tx) => {
        if (remove.length > 0) {
          await tx.delete(userGroupMembers)
            .where(and(
              eq(userGroupMembers.groupId, id),
              inArray(userGroupMembers.userId, remove)
            ));
        }

        if (add.length > 0) {
           const values = add.map(userId => ({
            userId,
            groupId: id,
          }));
          await tx.insert(userGroupMembers)
            .values(values)
            .onConflictDoNothing()
            .execute();
        }
      });

      return { message: '用户组用户更新成功' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      console.error('Update Group Users Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });
}
