import { db } from '../../db';
import { userEvents } from '../../db/schema';
import { sql } from 'drizzle-orm';

export async function getVisitData(startDate?: string, endDate?: string) {
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
  // We need to return an array of objects where each object represents a data point
  // For stacked line chart, we can return multiple entries per date: one for PV, one for UV
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
}

export async function getCumulativeUsersData(startDate?: string, endDate?: string) {
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
}

export async function getTopPages(startDate?: string, endDate?: string) {
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
}

export async function getUserGrowthData(startDate?: string, endDate?: string) {
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
}
