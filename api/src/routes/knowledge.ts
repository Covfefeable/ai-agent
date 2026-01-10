import { FastifyInstance } from 'fastify';
import axios from 'axios';
import FormData from 'form-data';
import { z } from 'zod';
import { db } from '../db';
import { datasets } from '../db/schema';
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

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

export async function knowledgeRoutes(fastify: FastifyInstance) {
  // Create dataset
  fastify.post('/datasets', async (request: any, reply) => {
    try {
      const body = createDatasetSchema.parse(request.body);
      const userId = request.user.id; // user object is attached by auth middleware
      
      // Append random suffix to name for Dify to ensure uniqueness
      const suffix = randomBytes(3).toString('hex');
      const difyName = `${body.name}_${suffix}`;

      const payload = {
        ...body,
        name: difyName,
        retrieval_model: {
          search_method: 'hybrid_search',
          reranking_enable: true,
          top_k: 5,
          score_threshold_enabled: false,
        },
      };

      const response = await axios.post(`${process.env.DIFY_BASE_URL}/datasets`, payload, {
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const difyDataset = response.data;

      // Save to local database
      const [newDataset] = await db.insert(datasets).values({
        difyId: difyDataset.id,
        userId: userId,
        name: body.name,
        description: body.description,
      }).returning();

      return { ...difyDataset, localId: newDataset.id };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Validation Error', errors: error.issues });
        return;
      }
      
      console.error('Dify API Error:', error.response?.data || error.message);
      
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      
      reply.status(status).send({ message });
    }
  });

  // Get datasets list
  fastify.get('/datasets', async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const userRole = request.user.role;
      const { keyword, page = 1, limit = 20 } = request.query as { keyword?: string; page?: number; limit?: number };
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      const conditions = [];
      
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }
      
      if (keyword) {
        conditions.push(or(
          ilike(datasets.name, `%${keyword}%`), 
          ilike(datasets.description, `%${keyword}%`)
        ));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(datasets)
        .where(whereClause);
      const total = Number(countResult?.count || 0);
      
      // Get paginated data
      const userDatasets = await db.select()
        .from(datasets)
        .where(whereClause)
        .orderBy(desc(datasets.createdAt))
        .limit(limitNum)
        .offset(offset);
      
      return { 
        data: userDatasets,
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error: any) {
      console.error('Get Datasets Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Delete dataset
  fastify.delete('/datasets/:id', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Delete from Dify
      try {
        await axios.delete(`${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        });
      } catch (difyError: any) {
        console.error('Dify Delete Error:', difyError.response?.data || difyError.message);
        // Continue to delete locally even if Dify fails (e.g. already deleted)
        // Unless it's a permission error or something critical?
        // For now, let's assume if it fails we still want to clean up local DB or maybe not?
        // If Dify is down, we might want to keep it locally? 
        // But usually sync issues are annoying. Let's proceed with local delete but log error.
        if (difyError.response?.status !== 404) {
             // If it's not 404, maybe we should stop? 
             // But the user wants to delete it.
        }
      }

      // Delete from local db
      await db.delete(datasets)
        .where(eq(datasets.id, id));

      return { message: 'Dataset deleted successfully' };
    } catch (error: any) {
      console.error('Delete Dataset Error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update dataset
  fastify.patch('/datasets/:id', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const { name, description } = request.body;

      if (!name) {
        return reply.status(400).send({ message: 'Name is required' });
      }

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Update Dify
      try {
        const difyUpdatePayload: any = { description };
        if (name) {
          const suffix = randomBytes(3).toString('hex');
          difyUpdatePayload.name = `${name}_${suffix}`;
        }

        await axios.patch(`${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}`, difyUpdatePayload, {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (difyError: any) {
        console.error('Dify Update Error:', difyError.response?.data || difyError.message);
        throw difyError;
      }

      // Update local db
      const [updatedDataset] = await db.update(datasets)
        .set({ name, description })
        .where(eq(datasets.id, id))
        .returning();

      return updatedDataset;
    } catch (error: any) {
      console.error('Update Dataset Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Get dataset documents
  fastify.get('/datasets/:id/documents', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const { page = 1, limit = 20, keyword } = request.query;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Get documents from Dify
      const response = await axios.get(`${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/documents`, {
        params: { page, limit, keyword },
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Get Documents Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Upload document
  fastify.post('/datasets/:id/documents/upload', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      
      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }
      
      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

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
        return reply.status(400).send({ message: 'File is required' });
      }

      const form = new FormData();
      const dataPayload = {
        indexing_technique: "high_quality",
        doc_form: "hierarchical_model",
        process_rule: {
          mode: "hierarchical",
          rules: {
            pre_processing_rules: [
              {
                id: "remove_extra_spaces",
                enabled: true
              },
            ],
            segmentation: {
              separator: separator,
              max_tokens: max_tokens
            },
            parent_mode: "paragraph",
            subchunk_segmentation: {
              separator: "\n",
              max_tokens: 100,
              chunk_overlap: 10
            }
          }
        }
      };

      form.append('data', JSON.stringify(dataPayload));
      form.append('file', fileBuffer, { filename, contentType: mimetype });

      const response = await axios.post(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/document/create-by-file`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`,
            ...form.getHeaders()
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Upload Document Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  fastify.post('/datasets/:id/documents/create-by-text', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const body = createDocumentByTextSchema.parse(request.body);

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      const response = await axios.post(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/document/create-by-text`,
        {
          name: body.name,
          text: body.text,
          indexing_technique: body.indexing_technique,
          doc_form: body.doc_form,
          process_rule: {
            mode: "hierarchical",
            rules: {
              pre_processing_rules: [
                { id: "remove_extra_spaces", enabled: true },
              ],
              segmentation: {
                separator: body.separator,
                max_tokens: body.max_tokens
              },
              parent_mode: "paragraph",
              subchunk_segmentation: {
                separator: "\n",
                max_tokens: 100,
                chunk_overlap: 10,
              },
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return response.data;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Validation Error', errors: error.issues });
        return;
      }

      console.error('Create Document By Text Error:', error.response?.data || error.message);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Delete document
  fastify.delete('/datasets/:id/documents/:documentId', async (request: any, reply) => {
    try {
      const { id, documentId } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      
      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }
      
      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      const response = await axios.delete(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Delete Document Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Get document segments
  fastify.get('/datasets/:id/documents/:documentId/segments', async (request: any, reply) => {
    try {
      const { id, documentId } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const { page = 1, limit = 20 } = request.query;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Get segments from Dify
      const response = await axios.get(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments`,
        {
          params: { page, limit },
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Get Segments Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Update segment
  fastify.post('/datasets/:id/documents/:documentId/segments/:segmentId', async (request: any, reply) => {
    try {
      const { id, documentId, segmentId } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const body = request.body;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Update segment in Dify
      const response = await axios.post(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments/${segmentId}`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Update Segment Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Delete segment
  fastify.delete('/datasets/:id/documents/:documentId/segments/:segmentId', async (request: any, reply) => {
    try {
      const { id, documentId, segmentId } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      // Delete segment in Dify
      const response = await axios.delete(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments/${segmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Delete Segment Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });

  // Retrieve from dataset
  fastify.post('/datasets/:id/retrieve', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const userRole = request.user.role;
      const { query } = request.body;

      const conditions = [eq(datasets.id, id)];
      if (!['owner', 'admin'].includes(userRole)) {
        conditions.push(eq(datasets.userId, userId));
      }

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(...conditions))
        .limit(1);

      if (!dataset) {
        return reply.status(404).send({ message: 'Dataset not found' });
      }

      const response = await axios.post(
        `${process.env.DIFY_BASE_URL}/datasets/${dataset.difyId}/retrieve`,
        {
          query
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_KNOWLEDGE_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Retrieve Error:', error);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Internal Server Error';
      reply.status(status).send({ message });
    }
  });
}
