import http from '@/lib/http';

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category: 'general' | 'preference' | 'knowledge' | 'summary';
  createdAt: string;
  updatedAt: string;
}

export const memoriesApi = {
  getMemories: () => {
    return http.get<unknown, Memory[]>('/memories');
  },

  deleteMemory: (id: string) => {
    return http.delete(`/memories/${id}`);
  },

  updateMemory: (id: string, content: string) => {
    return http.patch(`/memories/${id}`, { content });
  },
};
