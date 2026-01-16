import { db } from '../db';
import { userEvents } from '../db/schema';
import { sql } from 'drizzle-orm';

interface SummaryStat {
  value: number;
  change: number; // percentage change
}

interface SummaryData {
  activeUsers: SummaryStat;
  registeredUsers: SummaryStat;
}

export const analyticsService = {
  // Visit Data
  async getVisitData(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      // End date should include the full day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    // PV: Count all 'visit' events
    // UV: Count unique userId/ip for 'visit' events
    const stats = await db.execute(sql`
      SELECT 
        DATE(${userEvents.createdAt}) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT COALESCE(${userEvents.userId}::text, ${userEvents.ip})) as uv
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND ${userEvents.url} IS NOT NULL 
      AND ${userEvents.url} != ''
      AND ${dateFilter}
      GROUP BY DATE(${userEvents.createdAt})
      ORDER BY date ASC
    `);

    // Format data for Ant Design Charts
    const chartData: any[] = [];
    const dataMap = new Map<string, { pv: number, uv: number }>();
    
    stats.forEach((row: any) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      dataMap.set(dateStr, {
        pv: Number(row.pv),
        uv: Number(row.uv)
      });
    });

    if (startDate && endDate) {
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayStats = dataMap.get(dateStr) || { pv: 0, uv: 0 };
        
        chartData.push({
          date: dateStr,
          value: dayStats.pv,
          type: 'PV'
        });
        
        chartData.push({
          date: dateStr,
          value: dayStats.uv,
          type: 'UV'
        });
        
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Fallback if no date range provided
      stats.forEach((row: any) => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        chartData.push({
          date: dateStr,
          value: Number(row.pv),
          type: 'PV'
        });
        chartData.push({
          date: dateStr,
          value: Number(row.uv),
          type: 'UV'
        });
      });
    }

    return chartData;
  },

  async getCumulativeUsersData(startDate?: string, endDate?: string) {
    // 1. Get base count (total registered users before startDate)
    // Note: Adjust for Timezone (assuming CST +8)
    // startDate is YYYY-MM-DD. new Date(startDate) gives UTC 00:00.
    // We want 00:00 CST, which is previous day 16:00 UTC.
    let baseCount = 0;
    if (startDate) {
      const start = new Date(startDate);
      const startCST = new Date(start.getTime() - 8 * 60 * 60 * 1000);
      
      const baseCountResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM ${userEvents}
        WHERE ${userEvents.eventName} = 'register'
        AND ${userEvents.createdAt} < ${startCST.toISOString()}
      `);
      baseCount = Number(baseCountResult[0].count);
    }

    // 2. Get daily increments within range
    let dateFilter = sql`1=1`;
    if (startDate) {
      const start = new Date(startDate);
      const startCST = new Date(start.getTime() - 8 * 60 * 60 * 1000);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${startCST.toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      // End date 23:59:59 CST = End date 15:59:59 UTC
      const endCST = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000 - 1);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${endCST.toISOString()}`;
    }

    // Group by date in CST (+8 hours)
    const dailyIncrements = await db.execute(sql`
      SELECT 
        DATE(${userEvents.createdAt} + interval '8 hours') as date,
        COUNT(*) as count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'register'
      AND ${dateFilter}
      GROUP BY DATE(${userEvents.createdAt} + interval '8 hours')
      ORDER BY date ASC
    `);

    // 3. Process data
    const chartData: any[] = [];
    const incrementMap = new Map<string, number>();
    
    dailyIncrements.forEach((row: any) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      incrementMap.set(dateStr, Number(row.count));
    });

    if (startDate && endDate) {
      const current = new Date(startDate);
      const end = new Date(endDate);
      let runningTotal = baseCount;
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dailyCount = incrementMap.get(dateStr) || 0;
        runningTotal += dailyCount;
        
        chartData.push({
          date: dateStr,
          value: runningTotal,
          type: 'Total Users'
        });
        
        current.setDate(current.getDate() + 1);
      }
    } else {
      let runningTotal = baseCount;
      dailyIncrements.forEach((row: any) => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        runningTotal += Number(row.count);
        chartData.push({
          date: dateStr,
          value: runningTotal,
          type: 'Total Users'
        });
      });
    }

    return chartData;
  },

  async getTopPages(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const topPages = await db.execute(sql`
      SELECT 
        ${userEvents.url} as url,
        COUNT(*) as pv,
        COUNT(DISTINCT COALESCE(${userEvents.userId}::text, ${userEvents.ip})) as uv
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND ${userEvents.url} IS NOT NULL 
      AND ${userEvents.url} != ''
      AND ${dateFilter}
      GROUP BY ${userEvents.url}
      ORDER BY pv DESC
      LIMIT 10
    `);

    return topPages.map((row: any) => ({
      url: row.url,
      pv: Number(row.pv),
      uv: Number(row.uv)
    }));
  },

  async getUserGrowthData(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const stats = await db.execute(sql`
      SELECT 
        DATE(${userEvents.createdAt}) as date,
        COUNT(DISTINCT CASE WHEN ${userEvents.eventName} = 'login' THEN ${userEvents.userId} END) as login_count,
        COUNT(DISTINCT CASE WHEN ${userEvents.eventName} = 'register' THEN ${userEvents.userId} END) as register_count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} IN ('login', 'register')
      AND ${dateFilter}
      GROUP BY DATE(${userEvents.createdAt})
      ORDER BY date ASC
    `);

    const chartData: any[] = [];
    const dataMap = new Map<string, { login: number, register: number }>();
    
    stats.forEach((row: any) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      dataMap.set(dateStr, {
        login: Number(row.login_count),
        register: Number(row.register_count)
      });
    });

    if (startDate && endDate) {
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayStats = dataMap.get(dateStr) || { login: 0, register: 0 };
        
        chartData.push({
          date: dateStr,
          value: dayStats.login,
          type: 'Login'
        });
        
        chartData.push({
          date: dateStr,
          value: dayStats.register,
          type: 'Register'
        });
        
        current.setDate(current.getDate() + 1);
      }
    } else {
      stats.forEach((row: any) => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        chartData.push({
          date: dateStr,
          value: Number(row.login_count),
          type: 'Login'
        });
        chartData.push({
          date: dateStr,
          value: Number(row.register_count),
          type: 'Register'
        });
      });
    }

    return chartData;
  },

  // Profile Stats
  async getBrowserStats(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const stats = await db.execute(sql`
      SELECT 
        ${userEvents.browser} as browser_col,
        COUNT(*) as count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND (
        (${userEvents.browser} IS NOT NULL AND ${userEvents.browser} != '')
        OR 
        (${userEvents.userAgent} IS NOT NULL AND ${userEvents.userAgent} != '')
      )
      AND ${dateFilter}
      GROUP BY ${userEvents.browser}
    `);

    const browserStats = new Map<string, number>();

    stats.forEach((row: any) => {
      let browserName = 'Unknown';

      if (row.browser_col) {
        // format is name:version
        const parts = row.browser_col.split(':');
        // If name is 'unknown', keep it as 'Unknown' (capitalized) for consistency
        if (parts[0] && parts[0] !== 'unknown') {
          browserName = parts[0];
        }
      }

      const currentCount = browserStats.get(browserName) || 0;
      browserStats.set(browserName, currentCount + Number(row.count));
    });

    return Array.from(browserStats.entries())
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value);
  },

  async getOsStats(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const stats = await db.execute(sql`
      SELECT 
        ${userEvents.os} as os_col,
        COUNT(*) as count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND ${userEvents.os} IS NOT NULL 
      AND ${userEvents.os} != ''
      AND ${dateFilter}
      GROUP BY ${userEvents.os}
    `);

    const osStats = new Map<string, number>();

    stats.forEach((row: any) => {
      let osName = 'Unknown';

      if (row.os_col) {
        // format is name:version
        const parts = row.os_col.split(':');
        if (parts[0] && parts[0] !== 'unknown') {
          osName = parts[0];
        }
      }

      const currentCount = osStats.get(osName) || 0;
      osStats.set(osName, currentCount + Number(row.count));
    });

    return Array.from(osStats.entries())
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value);
  },

  async getActiveHoursStats(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const stats = await db.execute(sql`
      SELECT 
        EXTRACT(HOUR FROM ${userEvents.createdAt} + interval '8 hours') as hour,
        COUNT(*) as count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND ${dateFilter}
      GROUP BY hour
      ORDER BY hour ASC
    `);

    const hoursMap = new Map<number, number>();
    stats.forEach((row: any) => {
      hoursMap.set(Number(row.hour), Number(row.count));
    });

    const result: any[] = [];
    for (let i = 0; i < 24; i++) {
      result.push({
        hour: `${i}点`,
        value: hoursMap.get(i) || 0
      });
    }
    return result;
  },

  async getDeviceStats(startDate?: string, endDate?: string) {
    let dateFilter = sql`1=1`;
    if (startDate) {
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} >= ${new Date(startDate).toISOString()}`;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = sql`${dateFilter} AND ${userEvents.createdAt} <= ${end.toISOString()}`;
    }

    const stats = await db.execute(sql`
      SELECT 
        ${userEvents.device} as device_col,
        COUNT(*) as count
      FROM ${userEvents}
      WHERE ${userEvents.eventName} = 'visit'
      AND ${userEvents.device} IS NOT NULL 
      AND ${userEvents.device} != ''
      AND ${dateFilter}
      GROUP BY ${userEvents.device}
    `);

    const deviceStats = new Map<string, number>();

    stats.forEach((row: any) => {
      let deviceName = 'Unknown'; // Default for desktop or unrecognized

      if (row.device_col) {
        // format is vendor:model
        const parts = row.device_col.split(':');
        // If vendor is available, use it (e.g., Apple, Samsung)
        if (parts[0] && parts[0] !== 'unknown') {
          deviceName = parts[0];
        }
      }

      const currentCount = deviceStats.get(deviceName) || 0;
      deviceStats.set(deviceName, currentCount + Number(row.count));
    });

    return Array.from(deviceStats.entries())
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value);
  },

  // Summary Stats
  async getSummaryStats(startDate?: string, endDate?: string): Promise<SummaryData> {
    if (!startDate || !endDate) {
      return {
        activeUsers: { value: 0, change: 0 },
        registeredUsers: { value: 0, change: 0 },
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const duration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - duration - 1);
    const previousEnd = new Date(start.getTime() - 1);

    // Query Current Period
    const currentStats = await this.getPeriodStats(start, end);
    
    // Query Previous Period
    const previousStats = await this.getPeriodStats(previousStart, previousEnd);

    return {
      activeUsers: {
        value: currentStats.activeUsers,
        change: this.calculateChange(currentStats.activeUsers, previousStats.activeUsers),
      },
      registeredUsers: {
        value: currentStats.registeredUsers,
        change: this.calculateChange(currentStats.registeredUsers, previousStats.registeredUsers),
      },
    };
  },

  async getPeriodStats(start: Date, end: Date) {
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
  },

  calculateChange(current: number, previous: number): number {
    if (previous === 0) {
      if (current === 0) return 0;
      return 100;
    }
    return Number(((current - previous) / previous * 100).toFixed(2));
  }
};
