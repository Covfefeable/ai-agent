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
