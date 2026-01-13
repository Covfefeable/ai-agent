import http from '@/lib/http';

export interface ReportEventParams {
  eventName: string;
  extraData?: string;
  url?: string;
}

export const eventsApi = {
  /**
   * 上报用户事件
   */
  report: (params: ReportEventParams) => {
    // 使用 catch 捕获错误，确保上报失败不影响主流程
    return http.post('/events', params).catch((err) => {
      console.error('Failed to report event:', err);
    });
  },
};
