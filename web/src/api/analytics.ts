import http from '@/lib/http';

// Base interfaces
interface BaseValue {
  value: number;
}

interface DateBasedData extends BaseValue {
  date: string;
}

interface NameBasedData extends BaseValue {
  name: string;
}

// Derived interfaces
export interface VisitData extends DateBasedData {
  type: 'PV' | 'UV';
}

export interface UserGrowthData extends DateBasedData {
  type: 'Login' | 'Register';
}

export interface CumulativeUserData extends DateBasedData {
  type: 'Total Users';
}

export interface TopPageData {
  url: string;
  pv: number;
  uv: number;
}

export type BrowserData = NameBasedData;
export type OsData = NameBasedData;
export type DeviceData = NameBasedData;

export interface ActiveHoursData extends BaseValue {
  hour: string;
}

export interface SummaryStat extends BaseValue {
  change: number;
}

export interface SummaryData {
  activeUsers: SummaryStat;
  registeredUsers: SummaryStat;
}

export interface AnalyticsStats {
  visit?: VisitData[];
  topPages?: TopPageData[];
  browser?: BrowserData[];
  os?: OsData[];
  device?: DeviceData[];
  userGrowth?: UserGrowthData[];
  cumulativeUsers?: CumulativeUserData[];
  activeHours?: ActiveHoursData[];
}

export const analyticsApi = {
  getStats: (startDate?: string, endDate?: string, type?: 'visit' | 'profile') => {
    return http.get<unknown, AnalyticsStats>('/analytics/stats', {
      params: { startDate, endDate, type },
    });
  },

  getSummary: (startDate?: string, endDate?: string) => {
    return http.get<unknown, SummaryData>('/analytics/summary', {
      params: { startDate, endDate },
    });
  },
};
