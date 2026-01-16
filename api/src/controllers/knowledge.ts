import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { knowledgeService } from '../services/knowledge';

const createDatasetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  indexing_technique: z.enum(['high_quality', 'economy']).optional().default('high_quality'),
  permission: z.enum(['only_me', 'all_team_members', 'partial_members']).optional().default('only_me'),
  provider: z.enum(['vendor', 'external']).optional().default('vendor'),
  embedding_model: z.string().optional(),
  embedding_model_provider: z.string().optional()
});

const createDocumentByTextSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  indexing_technique: z.enum(['high_quality', 'economy']).optional().default('high_quality'),
  doc_form: z.string().optional().default('hierarchical_model'),
  separator: z.string().optional().default('\n\n\n'),
  max_tokens: z.coerce.number().int().min(128).optional().default(1024),
});

export const knowledgeController = {
  async createDataset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createDatasetSchema.parse(request.body);
      const userId = (request as any).user.id;
      
      const result = await knowledgeService.createDataset(userId, body);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async listDatasets(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const query = request.query as any;

      const result = await knowledgeService.listDatasets(userId, userRole, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async deleteDataset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;

      const result = await knowledgeService.deleteDataset(id, userId, userRole);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: '服务器内部错误' });
    }
  },

  async updateDataset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const { name, description } = request.body as any;

      if (!name) {
        return reply.status(400).send({ message: '名称必填' });
      }

      const result = await knowledgeService.updateDataset(id, userId, userRole, { name, description });
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async listDocuments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const query = request.query as any;

      const result = await knowledgeService.listDocuments(id, userId, userRole, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async createDocumentByFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;

      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let filename = '';
      let mimetype = '';
      let separator = '\n\n\n';
      let max_tokens = 1024;

      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          filename = part.filename;
          mimetype = part.mimetype;
        } else {
          if (part.fieldname === 'separator') {
            separator = part.value as string;
          } else if (part.fieldname === 'max_tokens') {
            const val = part.value as string;
            max_tokens = parseInt(val) || 1024;
          }
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ message: '文件必填' });
      }

      const result = await knowledgeService.createDocumentByFile(
        id, 
        userId, 
        userRole, 
        { buffer: fileBuffer, filename, mimetype }, 
        { separator, max_tokens }
      );
      
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async createDocumentByText(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const body = createDocumentByTextSchema.parse(request.body);

      const result = await knowledgeService.createDocumentByText(id, userId, userRole, body);
      return result;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async deleteDocument(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, documentId } = request.params as { id: string; documentId: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;

      const result = await knowledgeService.deleteDocument(id, documentId, userId, userRole);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async listSegments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, documentId } = request.params as { id: string; documentId: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const query = request.query as any;

      const result = await knowledgeService.listSegments(id, documentId, userId, userRole, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async updateSegment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, documentId, segmentId } = request.params as { id: string; documentId: string; segmentId: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const body = request.body;

      const result = await knowledgeService.updateSegment(id, documentId, segmentId, userId, userRole, body);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async deleteSegment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, documentId, segmentId } = request.params as { id: string; documentId: string; segmentId: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;

      const result = await knowledgeService.deleteSegment(id, documentId, segmentId, userId, userRole);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  },

  async retrieve(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const userRole = (request as any).user.role;
      const { query } = request.body as { query: string };

      const result = await knowledgeService.retrieve(id, userId, userRole, query);
      return result;
    } catch (error: any) {
      request.log.error(error);
      if (error.message === '知识库不存在') {
        return reply.status(404).send({ message: error.message });
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message || '服务器内部错误';
      return reply.status(status).send({ message });
    }
  }
};
