import http from '@/lib/http';
import type { User } from './users';

export interface UserGroup {
  id: string;
  name: string;
  userCount: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface GroupUser extends User {
  isMember: boolean;
  groups?: string;
}

export const userGroupsApi = {
  list: (page: number = 1, limit: number = 20, keyword?: string) => {
    return http.get<unknown, PaginatedResponse<UserGroup>>('/user-groups', {
      params: { page, limit, keyword }
    });
  },
  create: (params: { name: string }) => {
    return http.post('/user-groups', params);
  },
  update: (id: string, params: { name: string }) => {
    return http.put(`/user-groups/${id}`, params);
  },
  remove: (id: string) => {
    return http.delete(`/user-groups/${id}`);
  },
  getUsers: (id: string, page: number = 1, limit: number = 20, keyword?: string) => {
    return http.get<unknown, PaginatedResponse<GroupUser>>(`/user-groups/${id}/users`, {
      params: { page, limit, keyword }
    });
  },
  addUsers: (id: string, userIds: string[]) => {
    return http.post(`/user-groups/${id}/users`, { userIds });
  },
  updateUsers: (id: string, params: { add: string[]; remove: string[] }) => {
    return http.put(`/user-groups/${id}/users`, params);
  },
};
