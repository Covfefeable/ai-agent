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
      return reply.status(403).send({ message: 'Forbidden' });
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
      const list = await db
        .select({
            id: userGroups.id,
            name: userGroups.name,
            createdAt: userGroups.createdAt,
            userCount: sql<number>`count(${userGroupMembers.id})`.mapWith(Number)
        })
        .from(userGroups)
        .leftJoin(userGroupMembers, eq(userGroups.id, userGroupMembers.groupId))
        .where(conditions)
        .groupBy(userGroups.id)
        .orderBy(desc(userGroups.createdAt))
        .limit(limitNum)
        .offset(offset);

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
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Create user group
  fastify.post('/', async (request: any, reply) => {
    try {
      const schema = z.object({
        name: z.string().min(1, 'Group name is required'),
      });
      const { name } = schema.parse(request.body);

      const [group] = await db.insert(userGroups).values({ name }).returning();

      return group;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      console.error('Create User Group Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update user group
  fastify.put('/:id', async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        name: z.string().min(1, 'Group name is required'),
      });
      const { name } = schema.parse(request.body);

      const [group] = await db
        .update(userGroups)
        .set({ name })
        .where(eq(userGroups.id, id))
        .returning();

      if (!group) {
        return reply.status(404).send({ message: 'User group not found' });
      }

      return group;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      console.error('Update User Group Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
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
        return reply.status(404).send({ message: 'User group not found' });
      }

      return { message: 'User group deleted successfully' };
    } catch (error) {
      console.error('Delete User Group Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
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
      reply.status(500).send({ message: 'Internal Server Error' });
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
        return { message: 'No users selected' };
      }

      // Check if group exists
      const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
      if (!group) {
        return reply.status(404).send({ message: 'User group not found' });
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

      return { message: 'Users added successfully' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      console.error('Add Group Users Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
