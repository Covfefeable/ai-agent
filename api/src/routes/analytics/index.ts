import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getVisitData } from './visit';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', async (request, reply) => {
    try {
      const schema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      });
      
      const { startDate, endDate } = schema.parse(request.query);
      
      const visitData = await getVisitData(startDate, endDate);

      return { 
        visit: visitData
      };
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}
