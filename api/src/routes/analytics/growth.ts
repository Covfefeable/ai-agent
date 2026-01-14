import { db } from '../../db';
import { userEvents } from '../../db/schema';
import { sql } from 'drizzle-orm';

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
      SUM(CASE WHEN ${userEvents.eventName} = 'login' THEN 1 ELSE 0 END) as login_count,
      SUM(CASE WHEN ${userEvents.eventName} = 'register' THEN 1 ELSE 0 END) as register_count
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
