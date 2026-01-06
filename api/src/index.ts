import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from './db';
import { users } from './db/schema';

const fastify = Fastify({
  logger: true
});

// Register CORS
fastify.register(cors, {
  origin: true // Allow all origins for dev
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
