import http from '@/lib/http';

export interface Dataset {
  id: string;
  difyId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface CreateDatasetParams {
  name: string;
  description: string;
}

export const knowledgeApi = {
  getDatasets: () => {
    return http.get<any, { data: Dataset[] }>('/knowledge/datasets');
  },

  createDataset: (data: CreateDatasetParams) => {
    return http.post<any, Dataset>('/knowledge/datasets', data);
  },

  deleteDataset: (id: string) => {
    return http.delete(`/knowledge/datasets/${id}`);
  },
};
