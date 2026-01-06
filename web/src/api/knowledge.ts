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

export interface UpdateDatasetParams {
  name: string;
  description: string;
}

export interface Document {
  id: string;
  position: number;
  data_source_type: string;
  data_source_info: any;
  dataset_process_rule_id: string;
  name: string;
  created_from: string;
  created_by: string;
  created_at: number;
  tokens: number;
  indexing_status: string;
  error: string;
  enabled: boolean;
  disabled_at: number;
  disabled_by: string;
  archived: boolean;
  display_status: string;
  word_count: number;
  hit_count: number;
  doc_form: string;
}

export interface GetDocumentsResponse {
  data: Document[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

export const knowledgeApi = {
  getDatasets: () => {
    return http.get<any, { data: Dataset[] }>('/knowledge/datasets');
  },

  createDataset: (data: CreateDatasetParams) => {
    return http.post<any, Dataset>('/knowledge/datasets', data);
  },

  updateDataset: (id: string, data: UpdateDatasetParams) => {
    return http.patch<any, Dataset>(`/knowledge/datasets/${id}`, data);
  },

  deleteDataset: (id: string) => {
    return http.delete(`/knowledge/datasets/${id}`);
  },

  getDocuments: (id: string, page = 1, limit = 20) => {
    return http.get<any, GetDocumentsResponse>(`/knowledge/datasets/${id}/documents`, {
      params: { page, limit },
    });
  },

  uploadDocument: (id: string, file: File, params: { separator: string, max_tokens: number }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', params.separator);
    formData.append('max_tokens', params.max_tokens.toString());
    return http.post<any, any>(`/knowledge/datasets/${id}/documents/upload`, formData);
  },

  deleteDocument: (datasetId: string, documentId: string) => {
    return http.delete(`/knowledge/datasets/${datasetId}/documents/${documentId}`);
  },
};
