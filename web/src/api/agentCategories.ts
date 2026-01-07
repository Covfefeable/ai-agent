import http from '@/lib/http';

export interface AgentCategory {
  id: string;
  name: string;
  createdAt: string;
}

export const agentCategoriesApi = {
  list: () => {
    return http.get<unknown, { data: AgentCategory[] }>('/agent-categories');
  },
  create: (name: string) => {
    return http.post('/agent-categories', { name });
  },
  update: (id: string, name: string) => {
    return http.patch(`/agent-categories/${id}`, { name });
  },
  remove: (id: string) => {
    return http.delete(`/agent-categories/${id}`);
  },
};
