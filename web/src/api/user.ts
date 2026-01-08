import http from '@/lib/http';

export const userApi = {
  updatePassword: (data: { oldPassword: string; newPassword: string }) => {
    return http.patch('/users/me/password', data);
  },
  getUsageList: (params: { page: number; limit: number }) => {
    return http.get('/users/me/usage', { params });
  },
};
