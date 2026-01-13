import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { eventsApi } from '@/api/events'

// 注入全局上报方法
window.reportEvent = (eventName: string, extraData?: string | object) => {
  const data = typeof extraData === 'object' ? JSON.stringify(extraData) : extraData;
  eventsApi.report({ 
    eventName, 
    extraData: data,
    url: window.location.href,
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
