import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users, userUsage, agents, userGroupMembers, userGroups } from '../db/schema';
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
        return reply.status(404).send({ message: '用户不存在' });
      }

      return user;
    } catch (error) {
      console.error('Get Me Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
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

      const data = list.map(item => {
        let calculatedPoints = item.calculatedPoints;

        if (calculatedPoints === null || calculatedPoints === undefined) {
          const multiplier = item.multiplier ?? 1.0;
          calculatedPoints = Number((((item.promptTokens || 0) * 0.5 + (item.completionTokens || 0)) * multiplier / 2000).toFixed(2));
        }

        return {
          id: item.id,
          agentName: item.source === 'super_agent' ? 'Super Agent' : (agentMap[item.source] || '未知智能体'),
          promptTokens: item.promptTokens,
          completionTokens: item.completionTokens,
          totalTokens: item.totalTokens,
          calculatedPoints,
          latency: item.latency,
          totalPrice: item.totalPrice,
          currency: item.currency,
          createdAt: item.createdAt,
        };
      });

      return {
        data,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get User Usage Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
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
        return reply.status(404).send({ message: '用户不存在' });
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return reply.status(400).send({ message: '旧密码错误' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      return { message: '密码修改成功' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      console.error('Update Password Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Update user info (nickname)
  fastify.patch('/me/info', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const schema = z.object({
        name: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过50个字符'),
      });
      
      const { name } = schema.parse(request.body);

      await db.update(users)
        .set({ name })
        .where(eq(users.id, userId));

      return { message: '用户信息更新成功' };
    } catch (error) {
      console.error('Update User Info Error:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      reply.status(500).send({ message: '服务器内部错误' });
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

      return { message: '头像更新成功' };
    } catch (error) {
      console.error('Update Avatar Error:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Get users list (Owner/Admin only)
  fastify.get('/', async (request: any, reply) => {
    try {
      const userRole = request.user.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
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

      const allUsers = await db.query.users.findMany({
        where: conditions,
        limit: limitNum,
        offset: offset,
        orderBy: desc(users.createdAt),
        with: {
          groups: {
            with: {
              group: true
            }
          }
        }
      });

      const data = allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        balance: u.balance,
        createdAt: u.createdAt,
        groups: u.groups.map((g: any) => g.group.name).join(',')
      }));

      return { 
        data,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('Get Users Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
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
        return reply.status(403).send({ message: '无权限' });
      }

      // Validate role
      if (!['admin', 'member'].includes(role)) {
        return reply.status(400).send({ message: '无效的角色' });
      }

      // Check target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!targetUser) {
        return reply.status(404).send({ message: '用户不存在' });
      }

      // Cannot change own role
      if (targetUser.id === currentUserId) {
         return reply.status(400).send({ message: '不能修改自己的角色' });
      }

      // Cannot modify owner role
      if (targetUser.role === 'owner') {
        return reply.status(403).send({ message: '不能修改拥有者角色' });
      }
      
      // Update role
      await db.update(users)
        .set({ role: role as 'admin' | 'member' })
        .where(eq(users.id, id));

      return { message: '角色更新成功' };
    } catch (error) {
      console.error('Update Role Error:', error);
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  // Recharge user balance (Owner/Admin only)
  fastify.post('/:id/recharge', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const currentUserRole = request.user.role;

      if (!['owner', 'admin'].includes(currentUserRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const schema = z.object({
        amount: z.number().int().positive('充值金额必须为正整数'),
      });

      const { amount } = schema.parse(request.body);

      // Check target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!targetUser) {
        return reply.status(404).send({ message: '用户不存在' });
      }

      // Update balance
      await db.update(users)
        .set({ balance: sql`${users.balance} + ${amount}` })
        .where(eq(users.id, id));

      return { message: '充值成功' };
    } catch (error) {
      console.error('Recharge Error:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      reply.status(500).send({ message: '服务器内部错误' });
    }
  });
}
