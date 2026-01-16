import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { usersService } from '../services/users';

const updatePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6),
});

const updateInfoSchema = z.object({
  name: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过50个字符'),
});

const updateAvatarSchema = z.object({
  avatar: z.string(),
});

const rechargeSchema = z.object({
  amount: z.number().int().positive('充值金额必须为正整数'),
});

export const usersController = {
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const user = await usersService.getCurrentUser(userId);

      if (!user) {
        return reply.status(404).send({ message: '用户不存在' });
      }

      return user;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async getUsage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const query = request.query as any;
      const result = await usersService.getUserUsage(userId, query);
      return result;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updatePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { oldPassword, newPassword } = updatePasswordSchema.parse(request.body);
      
      const result = await usersService.updatePassword(userId, oldPassword, newPassword);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '用户不存在') {
        return reply.status(404).send({ message: error.message });
      }
      if (error.message === '旧密码错误') {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateInfo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { name } = updateInfoSchema.parse(request.body);
      
      const result = await usersService.updateUserInfo(userId, name);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateAvatar(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { avatar } = updateAvatarSchema.parse(request.body);

      const result = await usersService.updateAvatar(userId, avatar);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      if (!['owner', 'admin'].includes(userRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const query = request.query as any;
      const result = await usersService.listUsers(query);
      return result;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { role } = request.body as any;
      const currentUserRole = (request.user as any).role;
      const currentUserId = (request.user as any).id;

      if (!['owner', 'admin'].includes(currentUserRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const result = await usersService.updateUserRole(currentUserId, currentUserRole, id, role);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '无效的角色' || error.message === '不能修改自己的角色') {
        return reply.status(400).send({ message: error.message });
      }
      if (error.message === '用户不存在') {
        return reply.status(404).send({ message: error.message });
      }
      if (error.message === '不能修改拥有者角色') {
        return reply.status(403).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async recharge(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const currentUserRole = (request.user as any).role;

      if (!['owner', 'admin'].includes(currentUserRole)) {
        return reply.status(403).send({ message: '无权限' });
      }

      const { amount } = rechargeSchema.parse(request.body);

      const result = await usersService.rechargeUser(id, amount);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '用户不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
