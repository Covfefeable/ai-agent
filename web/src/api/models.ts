import http from '@/lib/http';

export interface Model {
  id: string;
  name: string;
  modelId: string;
  sort: number;
  enabled: boolean;
  iconUrl: string | null;
  multiplier: number;
  visibility: 'public' | 'selected_groups';
  groupIds?: string[];
  groups?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const modelsApi = {
  list: (keyword?: string, page: number = 1, limit: number = 20) => {
    return http.get<unknown, PaginatedResponse<Model>>('/models', {
      params: { keyword, page, limit }
    });
  },
  get: (id: string) => {
    return http.get<unknown, { data: Model }>(`/models/${id}`);
  },
  create: (params: { 
    name: string; 
    modelId: string; 
    sort: number; 
    enabled: boolean; 
    iconUrl?: string; 
    multiplier?: number;
    visibility: 'public' | 'selected_groups';
    groupIds?: string[];
  }) => {
    return http.post('/models', params);
  },
  update: (id: string, params: { 
    name?: string; 
    modelId?: string; 
    sort?: number; 
    enabled?: boolean; 
    iconUrl?: string; 
    multiplier?: number;
    visibility?: 'public' | 'selected_groups';
    groupIds?: string[];
  }) => {
    return http.patch(`/models/${id}`, params);
  },
  remove: (id: string) => {
    return http.delete(`/models/${id}`);
  },
};
