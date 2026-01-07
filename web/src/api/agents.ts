import http from '@/lib/http';

export interface Agent {
  id: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  categoryId?: string | null;
  createdAt: string;
}

export const agentsApi = {
  list: (keyword?: string) => {
    return http.get<unknown, { data: Agent[] }>('/agents', {
      params: { keyword }
    });
  },
  get: (id: string) => {
    return http.get<unknown, { data: Agent & { apiKey: string } }>(`/agents/${id}`);
  },
  create: (params: { apiKey: string; isPublic?: boolean; categoryId?: string }) => {
    return http.post('/agents', params);
  },
  update: (id: string, params?: { apiKey?: string; isPublic?: boolean; categoryId?: string | null }) => {
    return http.patch(`/agents/${id}`, params || {});
  },
  remove: (id: string) => {
    return http.delete(`/agents/${id}`);
  },
};
