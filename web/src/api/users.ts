import http from '@/lib/http';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export const usersApi = {
  getUsers: (keyword?: string) => {
    return http.get<any, { data: User[] }>('/users', {
      params: { keyword }
    });
  },

  updateRole: (id: string, role: 'admin' | 'member') => {
    return http.patch(`/users/${id}/role`, { role });
  },
};
