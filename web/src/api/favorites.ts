import http from '@/lib/http';
import type { Agent } from './agents';

export const favoritesApi = {
  add: (agentId: string) => {
    return http.post('/favorites', { agentId });
  },
  remove: (agentId: string) => {
    return http.delete(`/favorites/${agentId}`);
  },
  check: (agentId: string) => {
    return http.get<unknown, { isFavorite: boolean }>(`/favorites/${agentId}/check`);
  },
  list: () => {
    return http.get<unknown, { data: (Agent & { favoritedAt: string })[] }>('/favorites');
  }
};
