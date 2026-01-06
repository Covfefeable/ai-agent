import axios from 'axios';
import { toast } from 'sonner';

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login')) {
            toast.error('登录已过期，请重新登录');
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('没有权限执行此操作');
          break;
        case 404:
          toast.error('请求的资源不存在');
          break;
        case 500:
          toast.error('服务器内部错误，请稍后重试');
          break;
        default:
          toast.error(response.data?.message || '请求失败，请稍后重试');
      }
    } else if (error.request) {
      toast.error('网络连接失败，请检查网络设置');
    } else {
      toast.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

export default http;
