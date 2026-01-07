import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, desc, not, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

export async function usersRoutes(fastify: FastifyInstance) {
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
