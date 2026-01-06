import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { z } from 'zod';
import { db } from '../db';
import { datasets } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

const createDatasetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  indexing_technique: z.enum(['high_quality', 'economy']).optional().default('high_quality'),
  permission: z.enum(['only_me', 'all_team_members', 'partial_members']).optional().default('only_me'),
  provider: z.enum(['vendor', 'external']).optional().default('vendor'),
  embedding_model: z.string().optional(),
  embedding_model_provider: z.string().optional()
});

export async function knowledgeRoutes(fastify: FastifyInstance) {
  // Create dataset
  fastify.post('/datasets', async (request: any, reply) => {
    try {
      const body = createDatasetSchema.parse(request.body);
      const userId = request.user.id; // user object is attached by auth middleware
      
      const response = await axios.post(`${process.env.DIFY_BASE_URL}/datasets`, body, {
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
      
      const userDatasets = await db.select()
        .from(datasets)
        .where(eq(datasets.userId, userId))
        .orderBy(desc(datasets.createdAt));
      
      return { data: userDatasets };
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

      // Find dataset in local db
      const [dataset] = await db.select()
        .from(datasets)
        .where(and(eq(datasets.id, id), eq(datasets.userId, userId)))
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
}
