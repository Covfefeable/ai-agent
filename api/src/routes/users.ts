import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users, userUsage, agents } from '../db/schema';
import { eq, desc, not, ilike, or, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export async function usersRoutes(fastify: FastifyInstance) {
  // Get current user info
  fastify.get('/me', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const [user] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        balance: users.balance,
        avatar: users.avatar,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      return user;
    } catch (error) {
      console.error('Get Me Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Get user usage list
  fastify.get('/me/usage', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userUsage)
        .where(eq(userUsage.userId, userId));
      const total = Number(countResult?.count || 0);

      // Get list
      const list = await db
        .select()
        .from(userUsage)
        .where(eq(userUsage.userId, userId))
        .orderBy(desc(userUsage.createdAt))
        .limit(limitNum)
        .offset(offset);

      // Enrich with agent names
      // Deduplicate agentIds
      const agentIds = Array.from(new Set(
        list
          .map(item => item.source)
          .filter(source => source !== 'super_agent')
      ));
      
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const agentList = await db
          .select({ id: agents.id, title: agents.title })
          .from(agents)
          .where(inArray(agents.id, agentIds));
        agentMap = agentList.reduce((acc, curr) => {
          acc[curr.id] = curr.title;
          return acc;
        }, {} as Record<string, string>);
      }

      const data = list.map(item => ({
        ...item,
        agentName: item.source === 'super_agent' ? 'Super Agent' : (agentMap[item.source] || '未知智能体'),
      }));

      return {
        data,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get User Usage Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update password
  fastify.patch('/me/password', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const schema = z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(6),
      });
      
      const { oldPassword, newPassword } = schema.parse(request.body);

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return reply.status(400).send({ message: 'Invalid old password' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      return { message: 'Password updated successfully' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      console.error('Update Password Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update avatar
  fastify.patch('/me/avatar', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { avatar } = z.object({ avatar: z.string() }).parse(request.body);

      await db.update(users)
        .set({ avatar })
        .where(eq(users.id, userId));

      return { message: 'Avatar updated successfully' };
    } catch (error) {
      console.error('Update Avatar Error:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: (error as any).errors });
      }
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Get users list (Owner/Admin only)
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      const { keyword, page = 1, limit = 20 } = request.query as { keyword?: string; page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      let conditions = undefined;
      if (keyword) {
        conditions = or(ilike(users.name, `%${keyword}%`), ilike(users.email, `%${keyword}%`));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions);
      const total = Number(countResult?.count || 0);

      let baseQuery = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        balance: users.balance,
        createdAt: users.createdAt,
      })
      .from(users)
      .$dynamic();

      if (conditions) {
        baseQuery = baseQuery.where(conditions);
      }

      const allUsers = await baseQuery
        .orderBy(desc(users.createdAt))
        .limit(limitNum)
        .offset(offset);

      return { 
        data: allUsers,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get Users Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update user role (Owner/Admin only)
  fastify.patch('/:id/role', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { role } = request.body;
      const currentUserRole = request.user.role;
      const currentUserId = request.user.id;

      if (!['owner', 'admin'].includes(currentUserRole)) {
        return reply.status(403).send({ message: 'Forbidden' });
      }

      // Validate role
      if (!['admin', 'member'].includes(role)) {
        return reply.status(400).send({ message: 'Invalid role' });
      }

      // Check target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!targetUser) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // Cannot change own role
      if (targetUser.id === currentUserId) {
         return reply.status(400).send({ message: 'Cannot change your own role' });
      }

      // Cannot modify owner role
      if (targetUser.role === 'owner') {
        return reply.status(403).send({ message: 'Cannot modify owner role' });
      }
      
      // Update role
      await db.update(users)
        .set({ role })
        .where(eq(users.id, id));

      return { message: 'Role updated successfully' };
    } catch (error) {
      console.error('Update Role Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
