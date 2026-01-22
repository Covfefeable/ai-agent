import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { agentService } from '../services/agents';

export const agentController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      const userId = (request.user as any).id;
      const { keyword, page, limit } = request.query as { keyword?: string; page?: number; limit?: number };
      
      const result = await agentService.list({ 
        userId, 
        userRole, 
        keyword, 
        page: page ? Number(page) : undefined, 
        limit: limit ? Number(limit) : undefined 
      });
      
      return result;
    } catch (error: any) {
      request.log.error({ error }, 'Get agents error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async listPublic(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      const userId = (request.user as any).id;
      const { keyword, categoryId, page, limit } = request.query as { keyword?: string; categoryId?: string; page?: number; limit?: number };
      
      const result = await agentService.listPublic({
        userId,
        userRole,
        keyword,
        categoryId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined
      });

      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => {
          const { apiKey, ...rest } = item;
          return rest;
        });
      }

      return result;
    } catch (error: any) {
      request.log.error({ error }, 'Get public agents error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const agent = await agentService.getById(id);
      
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, (request.user as any)?.id, (request.user as any)?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      return { data: agent };
    } catch (error: any) {
      request.log.error({ error }, 'Get agent details error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const body = request.body as any;
      const userId = (request.user as any).id;
      const userRole = (request.user as any).role;

      const updated = await agentService.update(id, body, userId, userRole);
      return { data: updated };
    } catch (error: any) {
      request.log.error({ error }, 'Update agent error');
      const message = error.message || '服务器内部错误';
      const status = message === '无权限' ? 403 : (message === '智能体不存在' ? 404 : 500);
      reply.status(status).send({ message });
    }
  },

  async getParameters(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const agent = await agentService.getById(id);
      
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, (request.user as any)?.id, (request.user as any)?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await agentService.getParameters(agent);
      return data;
    } catch (error: any) {
      request.log.error({ error }, 'Get agent parameters error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const { last_id, limit = 20 } = request.query as { last_id?: string; limit?: number };
      
      const agent = await agentService.getById(id);
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, (request.user as any)?.id, (request.user as any)?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await agentService.getConversations(agent, {
        user: ((request.user as any)?.id ?? 'web').toString(),
        last_id,
        limit
      });
      return data;
    } catch (error: any) {
      request.log.error({ error }, 'Get agent conversations error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async chatMessages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const agent = await agentService.getById(id);
      
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, request.user?.id, request.user?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const body = request.body as any || {};
      const payload = {
        inputs: body?.inputs ?? {},
        query: body?.query,
        files: Array.isArray(body?.files) ? body.files : [],
        conversation_id: body?.conversation_id,
        response_mode: 'streaming',
        user: ((request.user as any)?.id ?? 'web').toString(),
        auto_generate_name: true,
      };

      if (!payload.query) {
        return reply.status(400).send({ message: 'query 参数必填' });
      }

      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      try {
        const logStream = await agentService.chatMessages(
          agent, 
          payload, 
          (request.user as any)?.id, 
          (request.user as any)?.role || 'guest'
        );
        return logStream;
      } catch (err: any) {
        if (err.message === '余额不足，请充值') {
           return reply.status(402).send({ message: err.message });
        }
        throw err;
      }
    } catch (error: any) {
      request.log.error({ error }, 'Chat messages proxy error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async deleteConversation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const conversationId = (request.params as any).conversationId;
      
      const agent = await agentService.getById(id);
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, request.user?.id, request.user?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await agentService.deleteConversation(
        agent, 
        conversationId, 
        ((request.user as any)?.id ?? 'web').toString()
      );
      return data;
    } catch (error: any) {
      request.log.error({ error }, 'Delete agent conversation error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const { conversation_id, first_id, limit = 20 } = request.query as { conversation_id: string; first_id?: string; limit?: number };
      
      const agent = await agentService.getById(id);
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, request.user?.id, request.user?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await agentService.getMessages(agent, {
        user: ((request.user as any)?.id ?? 'web').toString(),
        conversation_id,
        first_id,
        limit
      });
      return data;
    } catch (error: any) {
      request.log.error({ error }, 'Get agent messages error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async feedbackMessage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const { message_id } = request.params as { message_id: string };
      const bodySchema = z.object({
        rating: z.enum(['like', 'dislike']).nullable(),
      });
      const { rating } = bodySchema.parse(request.body);

      const agent = await agentService.getById(id);
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, request.user?.id, request.user?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await agentService.feedbackMessage(
        agent,
        message_id,
        rating || '', // Dify API expects string or null, but service expects string based on impl? Let's check service. Service takes string.
        ((request.user as any)?.id ?? 'web').toString()
      );
      return data;
    } catch (error: any) {
      request.log.error({ error }, 'Agent message feedback error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async uploadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request.params as any).id;
      const agent = await agentService.getById(id);
      
      if (!agent) {
        return reply.status(404).send({ message: '智能体不存在' });
      }
      
      const hasAccess = await agentService.verifyAccess(agent, request.user?.id, request.user?.role);
      if (!hasAccess) {
        return reply.status(403).send({ message: '无权限' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: '未上传文件' });
      }

      const resp = await agentService.uploadFile(
        agent,
        data,
        ((request.user as any)?.id ?? 'web').toString()
      );
      return resp;
    } catch (error: any) {
      request.log.error({ error }, 'Agent file upload error');
      reply.status(500).send({ message: '上传失败' });
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      const userId = (request.user as any).id;
      
      const bodySchema = z.object({
        apiKey: z.string().min(1),
        baseUrl: z.string().optional(),
        visibility: z.enum(['public', 'private', 'selected_groups']).optional(),
        groupIds: z.array(z.string().uuid()).optional(),
        categoryId: z.string().uuid().optional(),
        multiplier: z.number().min(0).optional(),
      });
      const parsed = bodySchema.parse(request.body);
      
      try {
        const created = await agentService.create({
          userId,
          ...parsed
        }, userRole);
        return { data: created };
      } catch (err: any) {
        if (err.message === '请选择可见用户组' || err.message === '您只能选择自己加入的用户组' || err.message === '智能体不存在' || err.message === '分类不存在') {
          return reply.status(400).send({ message: err.message });
        }
        throw err;
      }
    } catch (error: any) {
      request.log.error({ error }, 'Create agent error');
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || '服务器内部错误';
      reply.status(status).send({ message });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request.user as any).role;
      const userId = (request.user as any).id;
      const id = (request.params as any).id;

      try {
        await agentService.delete(id, userId, userRole);
        return { message: '已删除' };
      } catch (err: any) {
        if (err.message === '智能体不存在') {
          return reply.status(404).send({ message: err.message });
        }
        if (err.message === '无权限') {
          return reply.status(403).send({ message: err.message });
        }
        throw err;
      }
    } catch (error: any) {
      request.log.error({ error }, 'Delete agent error');
      reply.status(500).send({ message: '服务器内部错误' });
    }
  }
};
