import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { analyticsService } from '../services/analytics';

const summarySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const statsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['visit', 'profile']).optional(),
});

export const analyticsController = {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { startDate, endDate } = summarySchema.parse(request.query);
      const stats = await analyticsService.getSummaryStats(startDate, endDate);
      return stats;
    } catch (error) {
      request.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      return reply.status(500).send({ error: 'Failed to fetch summary stats' });
    }
  },

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { startDate, endDate, type } = statsSchema.parse(request.query);
      
      if (type === 'visit') {
        const [visitData, topPages, userGrowthData, cumulativeUsersData] = await Promise.all([
          analyticsService.getVisitData(startDate, endDate),
          analyticsService.getTopPages(startDate, endDate),
          analyticsService.getUserGrowthData(startDate, endDate),
          analyticsService.getCumulativeUsersData(startDate, endDate)
        ]);
        return { 
          visit: visitData,
          topPages,
          userGrowth: userGrowthData,
          cumulativeUsers: cumulativeUsersData
        };
      }

      if (type === 'profile') {
        const [browserStats, osStats, deviceStats, activeHoursStats] = await Promise.all([
          analyticsService.getBrowserStats(startDate, endDate),
          analyticsService.getOsStats(startDate, endDate),
          analyticsService.getDeviceStats(startDate, endDate),
          analyticsService.getActiveHoursStats(startDate, endDate)
        ]);
        return { 
          browser: browserStats,
          os: osStats,
          device: deviceStats,
          activeHours: activeHoursStats
        };
      }

      // Default: return all
      const [visitData, topPages, browserStats, osStats, deviceStats, userGrowthData, activeHoursStats] = await Promise.all([
        analyticsService.getVisitData(startDate, endDate),
        analyticsService.getTopPages(startDate, endDate),
        analyticsService.getBrowserStats(startDate, endDate),
        analyticsService.getOsStats(startDate, endDate),
        analyticsService.getDeviceStats(startDate, endDate),
        analyticsService.getUserGrowthData(startDate, endDate),
        analyticsService.getActiveHoursStats(startDate, endDate)
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
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: '验证错误', errors: error.issues });
      }
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  }
};
