import { eventsApi } from '@/api/events';

export function initMonitor() {
  // 注入全局上报方法
  window.reportEvent = (eventName: string, extraData?: string | object) => {
    const data = typeof extraData === 'object' ? JSON.stringify(extraData) : extraData;
    eventsApi.report({ 
      eventName, 
      extraData: data,
      url: window.location.href,
    });
  };

  // 监听 JS 错误
  window.addEventListener('error', (event) => {
    window.reportEvent('js_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  // 监听未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    window.reportEvent('js_error', {
      type: 'unhandledrejection',
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });
  });
}
