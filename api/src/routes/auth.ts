import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const INITIAL_BALANCE = parseInt(process.env.INITIAL_BALANCE || '100000', 10);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const { name, email, password } = registerSchema.parse(request.body);

      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return reply.status(400).send({ message: '用户已存在' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if any users exist to assign 'owner' role
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const isFirstUser = Number(countResult.count) === 0;
      const role = isFirstUser ? 'owner' : 'member';

      // Create user
      const [newUser] = await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        role,
        balance: INITIAL_BALANCE,
      }).returning({ id: users.id, name: users.name, email: users.email, role: users.role, balance: users.balance, avatar: users.avatar });

      // Generate token
      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

      return { user: newUser, token };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        return reply.status(401).send({ message: '用户名或密码错误' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return reply.status(401).send({ message: '用户名或密码错误' });
      }

      // Generate token
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance, avatar: user.avatar },
        token
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: (error as any).errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  });
}
