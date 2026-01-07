import http from '@/lib/http';
import { type PaginatedResponse } from './agents';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export const usersApi = {
  getUsers: (keyword?: string, page: number = 1, limit: number = 20) => {
    return http.get<unknown, PaginatedResponse<User>>('/users', {
      params: { keyword, page, limit }
    });
  },

  updateRole: (id: string, role: 'admin' | 'member') => {
    return http.patch(`/users/${id}/role`, { role });
  },
};
