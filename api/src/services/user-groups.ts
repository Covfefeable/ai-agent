import { db } from '../db';
import { users, userGroups, userGroupMembers } from '../db/schema';
import { eq, desc, ilike, sql, and, inArray, or } from 'drizzle-orm';

export const userGroupsService = {
  async listGroups(query: { page?: number; limit?: number; keyword?: string }) {
    const { page = 1, limit = 20, keyword } = query;
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
  },

  async createGroup(name: string) {
    const [group] = await db.insert(userGroups).values({ name }).returning();
    return group;
  },

  async updateGroup(id: string, name: string) {
    const [group] = await db
      .update(userGroups)
      .set({ name })
      .where(eq(userGroups.id, id))
      .returning();

    if (!group) {
      throw new Error('用户组不存在');
    }

    return group;
  },

  async deleteGroup(id: string) {
    // Delete members first
    await db.delete(userGroupMembers).where(eq(userGroupMembers.groupId, id));

    // Delete group
    const [group] = await db.delete(userGroups).where(eq(userGroups.id, id)).returning();

    if (!group) {
      throw new Error('用户组不存在');
    }

    return { message: '用户组删除成功' };
  },

  async getGroupUsers(id: string, query: { page?: number; limit?: number; keyword?: string }) {
    const { page = 1, limit = 20, keyword } = query;
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
  },

  async addUsersToGroup(id: string, userIds: string[]) {
    if (userIds.length === 0) {
      return { message: '未选择用户' };
    }

    // Check if group exists
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
    if (!group) {
      throw new Error('用户组不存在');
    }

    const values = userIds.map(userId => ({
      userId,
      groupId: id,
    }));

    await db.insert(userGroupMembers)
      .values(values)
      .onConflictDoNothing()
      .execute();

    return { message: '用户添加成功' };
  },

  async updateGroupUsers(id: string, add: string[], remove: string[]) {
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
  }
};
