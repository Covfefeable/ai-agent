import http from '@/lib/http';

export interface Agent {
  id: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  baseUrl: string | null;
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
  publicList: (keyword?: string, categoryId?: string) => {
    return http.get<unknown, { data: Agent[] }>('/agents/public', {
      params: { keyword, categoryId }
    });
  },
  get: (id: string) => {
    return http.get<unknown, { data: Agent & { apiKey: string } }>(`/agents/${id}`);
  },
  parameters: (id: string) => {
    return http.get<unknown, {
      opening_statement?: string;
      suggested_questions?: string[];
      suggested_questions_after_answer?: { enabled?: boolean };
      speech_to_text?: { enabled?: boolean };
      text_to_speech?: { enabled?: boolean; voice?: string; language?: string };
      retriever_resource?: { enabled?: boolean };
      annotation_reply?: { enabled?: boolean };
      more_like_this?: { enabled?: boolean };
      user_input_form?: unknown[];
      sensitive_word_avoidance?: { enabled?: boolean };
      system_parameters?: {
        image_file_size_limit?: number;
        video_file_size_limit?: number;
        audio_file_size_limit?: number;
        file_size_limit?: number;
        workflow_file_upload_limit?: number;
      };
      file_upload?: {
        enabled?: boolean;
        allowed_file_types?: string[];
        allowed_file_extensions?: string[];
        allowed_file_upload_methods?: string[];
        number_limits?: number;
        fileUploadConfig?: {
          file_size_limit?: number;
          batch_count_limit?: number;
          image_file_size_limit?: number;
          video_file_size_limit?: number;
          audio_file_size_limit?: number;
          workflow_file_upload_limit?: number;
          image_file_batch_limit?: number;
          single_chunk_attachment_limit?: number;
        };
        image?: { enabled?: boolean; number_limits?: number; detail?: string; transfer_methods?: string[] };
        audio?: { enabled?: boolean; number_limits?: number; transfer_methods?: string[] };
        video?: { enabled?: boolean; number_limits?: number; transfer_methods?: string[] };
        document?: { enabled?: boolean; number_limits?: number; transfer_methods?: string[] };
      };
    }>(`/agents/${id}/parameters`);
  },
  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<unknown, { id: string; name: string; size: number; extension: string; mime_type: string }>(`/agents/${id}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  create: (params: { apiKey: string; baseUrl?: string; isPublic?: boolean; categoryId?: string }) => {
    return http.post('/agents', params);
  },
  update: (id: string, params?: { apiKey?: string; baseUrl?: string; isPublic?: boolean; categoryId?: string | null }) => {
    return http.patch(`/agents/${id}`, params || {});
  },
  remove: (id: string) => {
    return http.delete(`/agents/${id}`);
  },
};
