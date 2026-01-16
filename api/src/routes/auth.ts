import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
}
