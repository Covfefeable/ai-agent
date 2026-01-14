import { db } from '../../db';
import { userEvents } from '../../db/schema';
import { sql } from 'drizzle-orm';

interface SummaryStat {
  value: number;
  change: number; // percentage change
}

interface SummaryData {
  activeUsers: SummaryStat;
  registeredUsers: SummaryStat;
}

export async function getSummaryStats(startDate?: string, endDate?: string): Promise<SummaryData> {
  if (!startDate || !endDate) {
    // Default or empty return if no dates provided (though frontend usually provides them)
    return {
      activeUsers: { value: 0, change: 0 },
      registeredUsers: { value: 0, change: 0 },
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  // Set end date to end of day
  end.setHours(23, 59, 59, 999);
  
  const duration = end.getTime() - start.getTime(); // Duration in ms
  const previousStart = new Date(start.getTime() - duration - 1);
  const previousEnd = new Date(start.getTime() - 1);

  // Query Current Period
  const currentStats = await getPeriodStats(start, end);
  
  // Query Previous Period
  const previousStats = await getPeriodStats(previousStart, previousEnd);

  return {
    activeUsers: {
      value: currentStats.activeUsers,
      change: calculateChange(currentStats.activeUsers, previousStats.activeUsers),
    },
    registeredUsers: {
      value: currentStats.registeredUsers,
      change: calculateChange(currentStats.registeredUsers, previousStats.registeredUsers),
    },
  };
}

async function getPeriodStats(start: Date, end: Date) {
  const stats = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT CASE WHEN ${userEvents.eventName} = 'login' THEN ${userEvents.userId} END) as active_users,
      COUNT(DISTINCT CASE WHEN ${userEvents.eventName} = 'register' THEN ${userEvents.userId} END) as registered_users
    FROM ${userEvents}
    WHERE ${userEvents.createdAt} >= ${start.toISOString()}
    AND ${userEvents.createdAt} <= ${end.toISOString()}
  `);

  return {
    activeUsers: Number(stats[0].active_users),
    registeredUsers: Number(stats[0].registered_users),
  };
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    // If previous is 0 and current is 0, change is 0%
    if (current === 0) return 0;
    // If previous is 0 and current > 0, treat as 100% growth
    return 100;
  }
  return Number(((current - previous) / previous * 100).toFixed(2));
}
