import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { chatService } from '../services/chat';
import { memoryService } from '../services/memories';

const chatSchema = z.object({
  inputs: z.any().optional(),
  query: z.string(),
  conversation_id: z.string().optional(),
  files: z.array(z.object({
    type: z.string(),
    transfer_method: z.string(),
    upload_file_id: z.string()
  })).optional()
});

export const chatController = {
  async message(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const body = chatSchema.parse(request.body);

      // 异步收集记忆，不阻塞主流程
      memoryService.addToBuffer(user.id, body.query).catch((err) => {
        request.log.error(`[Memory] Failed to add query to buffer: ${err.message}`);
      });

      const logStream = await chatService.chatMessage(user, body);

      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      return reply.send(logStream);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      if ((error as any).message === '用户不存在') {
        return reply.status(401).send({ message: (error as any).message });
      }
      if ((error as any).message === '余额不足，请充值') {
        return reply.status(402).send({ message: (error as any).message });
      }
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async upload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: '未上传文件' });
      }
      const user = request.user as any;
      const result = await chatService.uploadFile(user, data);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '上传失败' });
    }
  },

  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { last_id, limit } = request.query as { last_id?: string; limit?: number };
      const result = await chatService.getConversations(user, { last_id, limit: limit ? Number(limit) : undefined });
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '获取会话列表失败' });
    }
  },

  async deleteConversation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };
      const result = await chatService.deleteConversation(user, id);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '删除会话失败' });
    }
  },

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { conversation_id, first_id, limit } = request.query as { conversation_id: string; first_id?: string; limit?: number };
      const result = await chatService.getMessages(user, { conversation_id, first_id, limit: limit ? Number(limit) : undefined });
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '获取消息失败' });
    }
  },

  async feedback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { message_id } = request.params as { message_id: string };
      const { rating } = request.body as { rating: 'like' | 'dislike' | null };
      const result = await chatService.feedbackMessage(user, message_id, rating);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '提交反馈失败' });
    }
  },

  async stopGeneration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { task_id } = request.params as { task_id: string };
      const result = await chatService.stopGeneration(user, task_id);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '停止生成失败' });
    }
  }
};
