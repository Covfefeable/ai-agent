import http from '@/lib/http';
import { type PaginatedResponse } from './agents';

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
  data_source_info: unknown;
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
  hasFile?: boolean;
}

export interface GetDocumentsResponse {
  data: Document[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

export interface Segment {
  id: string;
  position: number;
  document_id: string;
  content: string;
  answer?: string;
  word_count: number;
  tokens: number;
  keywords: string[];
  index_node_id: string;
  index_node_hash: string;
  hit_count: number;
  enabled: boolean;
  disabled_at?: number;
  disabled_by?: string;
  status: string;
  created_by: string;
  created_at: number;
  indexing_at: number;
  completed_at: number;
  error?: string;
  stopped_at?: number;
}

export interface GetSegmentsResponse {
  data: Segment[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
  doc_form: string;
}

export interface UpdateSegmentParams {
  content: string;
  answer?: string;
  keywords?: string[];
  enabled?: boolean;
}

export const knowledgeApi = {
  getDatasets: (keyword?: string, page: number = 1, limit: number = 20) => {
    return http.get<unknown, PaginatedResponse<Dataset>>('/knowledge/datasets', {
      params: { keyword, page, limit }
    });
  },

  createDataset: (data: CreateDatasetParams) => {
    return http.post<unknown, Dataset>('/knowledge/datasets', data);
  },

  updateDataset: (id: string, data: UpdateDatasetParams) => {
    return http.patch<unknown, Dataset>(`/knowledge/datasets/${id}`, data);
  },

  deleteDataset: (id: string) => {
    return http.delete(`/knowledge/datasets/${id}`);
  },

  getDocuments: (id: string, page = 1, limit = 20, keyword?: string) => {
    return http.get<unknown, GetDocumentsResponse>(`/knowledge/datasets/${id}/documents`, {
      params: { page, limit, keyword },
    });
  },

  getSegments: (datasetId: string, documentId: string, page = 1, limit = 20) => {
    return http.get<unknown, GetSegmentsResponse>(`/knowledge/datasets/${datasetId}/documents/${documentId}/segments`, {
      params: { page, limit },
    });
  },

  updateSegment: (datasetId: string, documentId: string, segmentId: string, data: UpdateSegmentParams) => {
    return http.post<unknown, { data: Segment }>(`/knowledge/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`, {
      segment: data
    });
  },

  deleteSegment: (datasetId: string, documentId: string, segmentId: string) => {
    return http.delete(`/knowledge/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`);
  },

  uploadDocument: (id: string, file: File, params: { separator: string, max_tokens: number }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', params.separator);
    formData.append('max_tokens', params.max_tokens.toString());
    return http.post<unknown, unknown>(`/knowledge/datasets/${id}/documents/upload`, formData);
  },

  createDocumentByText: (id: string, data: { name: string; text: string; separator?: string; max_tokens?: number }) => {
    return http.post<unknown, unknown>(`/knowledge/datasets/${id}/documents/create-by-text`, data);
  },

  getDownloadUrl: (datasetId: string, documentId: string) => {
    return http.get<unknown, { url: string }>(`/knowledge/datasets/${datasetId}/documents/${documentId}/download`);
  },

  deleteDocument: (datasetId: string, documentId: string) => {
    return http.delete(`/knowledge/datasets/${datasetId}/documents/${documentId}`);
  },

  retrieve: (id: string, query: string, retrieval_model?: unknown) => {
    return http.post<unknown, { query: { content: string }, records: unknown[] }>(`/knowledge/datasets/${id}/retrieve`, {
      query,
      retrieval_model
    });
  },
};
