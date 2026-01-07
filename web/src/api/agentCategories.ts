import http from '@/lib/http';

export interface AgentCategory {
  id: string;
  name: string;
  sort: number;
  createdAt: string;
}

export const agentCategoriesApi = {
  list: () => {
    return http.get<unknown, { data: AgentCategory[] }>('/agent-categories');
  },
  create: (name: string, sort?: number) => {
    return http.post('/agent-categories', { name, sort });
  },
  update: (id: string, name: string, sort?: number) => {
    return http.patch(`/agent-categories/${id}`, { name, sort });
  },
  remove: (id: string) => {
    return http.delete(`/agent-categories/${id}`);
  },
};
