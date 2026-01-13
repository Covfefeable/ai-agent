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

export interface AnalyticsStats {
  visit: VisitData[];
  topPages: TopPageData[];
  browser: BrowserData[];
}

export const analyticsApi = {
  getStats: (startDate?: string, endDate?: string) => {
    return http.get<unknown, AnalyticsStats>('/analytics/stats', {
      params: { startDate, endDate },
    });
  },
};
