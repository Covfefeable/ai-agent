import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, email, password } = registerSchema.parse(request.body);
      const result = await authService.register({ name, email, password });
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      if ((error as any).message === '用户已存在') {
        return reply.status(400).send({ message: (error as any).message });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const result = await authService.login({ email, password });
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      if ((error as any).message === '用户名或密码错误') {
        return reply.status(401).send({ message: (error as any).message });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
