import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from './db';
import { users } from './db/schema';

const fastify = Fastify({
  logger: true
});

import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import multipart from '@fastify/multipart';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register Multipart
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 10MB
  }
});

// Register CORS
fastify.register(cors, {
  origin: true // Allow all origins for dev
});

// Authentication Middleware
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ message: 'Unauthorized' });
  }
});

// Register Routes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(async (instance) => {
  instance.addHook('preHandler', async (req, reply) => {
    await (instance as any).authenticate(req, reply);
  });
  instance.register(chatRoutes, { prefix: '/chat' });
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Example API: Get Users
fastify.get('/users', async () => {
  const allUsers = await db.select().from(users);
  return allUsers;
});

const start = async () => {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
