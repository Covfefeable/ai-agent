import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eventsService } from '../services/events';

const eventSchema = z.object({
  eventName: z.string(),
  extraData: z.string().optional(),
  url: z.string().optional(),
});

export const eventsController = {
  async track(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = eventSchema.parse(request.body);
      const authHeader = request.headers.authorization;
      const ip = request.ip;
      const userAgent = request.headers['user-agent'];

      const result = await eventsService.trackEvent({
        ...body,
        ip,
        userAgent,
        authHeader
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      request.log.error(error);
      return reply.status(400).send({ error: 'Invalid request' });
    }
  }
};
