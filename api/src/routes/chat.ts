import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import axios from 'axios';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Readable } from 'stream';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;

const chatSchema = z.object({
  query: z.string(),
  conversation_id: z.string().optional(),
  files: z.array(z.object({
    type: z.string(),
    transfer_method: z.string(),
    upload_file_id: z.string()
  })).optional()
});

export async function chatRoutes(fastify: FastifyInstance) {
  // Chat API - Streaming response
  fastify.post('/message', async (request, reply) => {
    try {
      // Get current user from token (middleware should have populated this, but for now we trust auth middleware)
      const user = request.user as any; 
      
      const { query, conversation_id, files } = chatSchema.parse(request.body);

      const response = await axios.post(
        `${DIFY_BASE_URL}/chat-messages`,
        {
          inputs: {},
          query,
          response_mode: 'streaming',
          conversation_id,
          user: user.id.toString(), // Use user ID as Dify user identifier
          files: files || []
        },
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      // Proxy the streaming response
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      
      return response.data;

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Validation error', errors: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Internal server error' });
    }
  });

  // File Upload API
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    try {
      const user = request.user as any;
      
      const formData = new FormData();
      // Need to convert stream to buffer or blob for axios/fetch to forward it
      const buffer = await data.toBuffer();
      const blob = new Blob([buffer], { type: data.mimetype });
      
      formData.append('file', blob, data.filename);
      formData.append('user', user.id.toString());

      const response = await axios.post(
        `${DIFY_BASE_URL}/files/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            // Axios automatically sets Content-Type for FormData, but we might need to be careful
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Upload failed' });
    }
  });
}
