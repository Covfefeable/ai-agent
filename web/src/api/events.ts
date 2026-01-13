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
    // 如果没有传入 url，则自动使用当前页面的 url
    const payload = {
      ...params,
      url: params.url || window.location.href,
    };
    
    // 使用 catch 捕获错误，确保上报失败不影响主流程
    return http.post('/events', payload).catch((err) => {
      console.error('Failed to report event:', err);
    });
  },
};
