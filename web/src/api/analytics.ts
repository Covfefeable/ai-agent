import http from '@/lib/http';

export interface VisitData {
  date: string;
  value: number;
  type: 'PV' | 'UV';
}

export interface TopPageData {
  url: string;
  pv: number;
  uv: number;
}

export interface BrowserData {
  name: string;
  value: number;
}

export interface OsData {
  name: string;
  value: number;
}

export interface DeviceData {
  name: string;
  value: number;
}

export interface UserGrowthData {
  date: string;
  value: number;
  type: 'Login' | 'Register';
}

export interface ActiveHoursData {
  hour: string;
  value: number;
}

export interface AnalyticsStats {
  visit?: VisitData[];
  topPages?: TopPageData[];
  browser?: BrowserData[];
  os?: OsData[];
  device?: DeviceData[];
  userGrowth?: UserGrowthData[];
  activeHours?: ActiveHoursData[];
}

export const analyticsApi = {
  getStats: (startDate?: string, endDate?: string, type?: 'visit' | 'profile') => {
    return http.get<unknown, AnalyticsStats>('/analytics/stats', {
      params: { startDate, endDate, type },
    });
  },
};
