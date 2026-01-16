import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { userGroupsService } from '../services/user-groups';

const createGroupSchema = z.object({
  name: z.string().min(1, '请输入用户组名称'),
});

const updateGroupSchema = z.object({
  name: z.string().min(1, '请输入用户组名称'),
});

const addUsersSchema = z.object({
  userIds: z.array(z.string().uuid()),
});

const updateGroupUsersSchema = z.object({
  add: z.array(z.string().uuid()).default([]),
  remove: z.array(z.string().uuid()).default([]),
});

export const userGroupsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const result = await userGroupsService.listGroups(query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createGroupSchema.parse(request.body);
      const result = await userGroupsService.createGroup(body.name);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const body = updateGroupSchema.parse(request.body);
      
      const result = await userGroupsService.updateGroup(id, body.name);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '用户组不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const result = await userGroupsService.deleteGroup(id);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '用户组不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async getGroupUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const query = request.query as any;
      const result = await userGroupsService.getGroupUsers(id, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async addUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const body = addUsersSchema.parse(request.body);
      
      const result = await userGroupsService.addUsersToGroup(id, body.userIds);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '用户组不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateGroupUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const body = updateGroupUsersSchema.parse(request.body);
      
      const result = await userGroupsService.updateGroupUsers(id, body.add, body.remove);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
