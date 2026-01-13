import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { eventsApi } from '@/api/events';

export function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    // 上报 visit 事件
    // eventsApi.report 会自动补充当前页面的 URL
    eventsApi.report({ 
      eventName: 'visit' 
    });
  }, [location.pathname]);

  return null;
}
