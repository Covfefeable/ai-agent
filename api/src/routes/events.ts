import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { userEvents } from '../db/schema';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    try {
      // Schema validation
      const schema = z.object({
        eventName: z.string(),
        extraData: z.string().optional(),
        url: z.string().optional(),
      });

      const body = schema.parse(request.body);
      
      // Try to get user ID from token if present
      let userId: string | null = null;
      const authHeader = request.headers.authorization;
      if (authHeader) {
          try {
              const token = authHeader.split(' ')[1];
              if (token) {
                  const decoded = jwt.verify(token, JWT_SECRET) as any;
                  userId = decoded.id;
              }
          } catch (e) {
              // Ignore token errors, treat as anonymous
          }
      }
      
      const ip = request.ip; // Fastify request object has ip
      const userAgent = request.headers['user-agent'] as string | undefined;

      await db.insert(userEvents).values({
        eventName: body.eventName,
        userId: userId, // Assuming userId is string (uuid) in schema
        extraData: body.extraData,
        url: body.url,
        ip: ip,
        userAgent: userAgent
      });

      return { success: true };
    } catch (error) {
      request.log.error(error);
      reply.status(400).send({ error: 'Invalid request' });
    }
  });
}
