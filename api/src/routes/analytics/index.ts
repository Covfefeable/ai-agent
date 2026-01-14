import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getVisitData, getTopPages, getBrowserStats, getOsStats, getDeviceStats, getActiveHoursStats } from './visit';
import { getUserGrowthData } from './growth';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', async (request, reply) => {
    try {
      const schema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        type: z.enum(['visit', 'profile']).optional(),
      });
      
      const { startDate, endDate, type } = schema.parse(request.query);
      
      if (type === 'visit') {
        const [visitData, topPages, userGrowthData] = await Promise.all([
          getVisitData(startDate, endDate),
          getTopPages(startDate, endDate),
          getUserGrowthData(startDate, endDate)
        ]);
        return { 
          visit: visitData,
          topPages,
          userGrowth: userGrowthData
        };
      }

      if (type === 'profile') {
        const [browserStats, osStats, deviceStats, activeHoursStats] = await Promise.all([
          getBrowserStats(startDate, endDate),
          getOsStats(startDate, endDate),
          getDeviceStats(startDate, endDate),
          getActiveHoursStats(startDate, endDate)
        ]);
        return { 
          browser: browserStats,
          os: osStats,
          device: deviceStats,
          activeHours: activeHoursStats
        };
      }

      // Default: return all (or handle as error if strict separation is required, but keeping backward compatibility is safer)
      const [visitData, topPages, browserStats, osStats, deviceStats, userGrowthData, activeHoursStats] = await Promise.all([
        getVisitData(startDate, endDate),
        getTopPages(startDate, endDate),
        getBrowserStats(startDate, endDate),
        getOsStats(startDate, endDate),
        getDeviceStats(startDate, endDate),
        getUserGrowthData(startDate, endDate),
        getActiveHoursStats(startDate, endDate)
      ]);

      return { 
        visit: visitData,
        topPages,
        browser: browserStats,
        os: osStats,
        device: deviceStats,
        userGrowth: userGrowthData,
        activeHours: activeHoursStats
      };
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}
