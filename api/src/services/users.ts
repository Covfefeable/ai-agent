import { db } from '../db';
import { users, userUsage, agents } from '../db/schema';
import { eq, desc, ilike, or, sql, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const usersService = {
  async getCurrentUser(userId: string) {
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      balance: users.balance,
      avatar: users.avatar,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);

    return user;
  },

  async getUserUsage(userId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = query;
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
  },

  async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      throw new Error('旧密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return { message: '密码修改成功' };
  },

  async updateUserInfo(userId: string, name: string) {
    await db.update(users)
      .set({ name })
      .where(eq(users.id, userId));

    return { message: '用户信息更新成功' };
  },

  async updateAvatar(userId: string, avatar: string) {
    await db.update(users)
      .set({ avatar })
      .where(eq(users.id, userId));

    return { message: '头像更新成功' };
  },

  async listUsers(query: { keyword?: string; page?: number; limit?: number }) {
    const { keyword, page = 1, limit = 20 } = query;
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
  },

  async updateUserRole(operatorId: string, operatorRole: string, targetUserId: string, newRole: string) {
    // Validate role
    if (!['admin', 'member'].includes(newRole)) {
      throw new Error('无效的角色');
    }

    // Check target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      throw new Error('用户不存在');
    }

    // Cannot change own role
    if (targetUser.id === operatorId) {
       throw new Error('不能修改自己的角色');
    }

    // Cannot modify owner role
    if (targetUser.role === 'owner') {
      throw new Error('不能修改拥有者角色');
    }
    
    // Update role
    await db.update(users)
      .set({ role: newRole as 'admin' | 'member' })
      .where(eq(users.id, targetUserId));

    return { message: '角色更新成功' };
  },

  async rechargeUser(targetUserId: string, amount: number) {
    // Check target user
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      throw new Error('用户不存在');
    }

    // Update balance
    await db.update(users)
      .set({ balance: sql`${users.balance} + ${amount}` })
      .where(eq(users.id, targetUserId));

    return { message: '充值成功' };
  }
};
