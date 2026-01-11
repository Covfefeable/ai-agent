import http from '@/lib/http';
import type { Conversation, Message } from './chat';

export interface Agent {
  id: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  baseUrl: string | null;
  visibility: 'public' | 'private' | 'selected_groups';
  categoryId?: string | null;
  multiplier: number;
  createdAt: string;
  groups?: string;
}

export interface AgentDetail extends Omit<Agent, 'groups'> {
  apiKey: string;
  groupIds: string[];
  userId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const agentsApi = {
  list: (keyword?: string, page: number = 1, limit: number = 20) => {
    return http.get<unknown, PaginatedResponse<Agent>>('/agents', {
      params: { keyword, page, limit }
    });
  },
  publicList: (keyword?: string, categoryId?: string, page: number = 1, limit: number = 20) => {
    return http.get<unknown, PaginatedResponse<Agent>>('/agents/public', {
      params: { keyword, categoryId, page, limit }
    });
  },
  get: (id: string) => {
    return http.get<unknown, { data: AgentDetail }>(`/agents/${id}`);
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
  create: (params: { apiKey: string; baseUrl?: string; visibility?: 'public' | 'private' | 'selected_groups'; groupIds?: string[]; categoryId?: string; multiplier?: number }) => {
    return http.post('/agents', params);
  },
  update: (id: string, params?: { apiKey?: string; baseUrl?: string; visibility?: 'public' | 'private' | 'selected_groups'; groupIds?: string[]; categoryId?: string | null; multiplier?: number }) => {
    return http.patch(`/agents/${id}`, params || {});
  },
  remove: (id: string) => {
    return http.delete(`/agents/${id}`);
  },
  getConversations: (id: string, last_id?: string, limit: number = 30) => {
    return http.get<unknown, { data: Conversation[], has_more: boolean, limit: number }>(`/agents/${id}/conversations`, {
      params: { last_id, limit }
    });
  },
  deleteConversation: (id: string, conversationId: string) => {
    return http.delete(`/agents/${id}/conversations/${conversationId}`);
  },
  getMessages: (id: string, conversationId: string) => {
    return http.get<unknown, { data: Message[] }>(`/agents/${id}/messages`, {
      params: { conversation_id: conversationId },
    });
  },
  sendFeedback: (id: string, messageId: string, rating: 'like' | 'dislike' | null) => {
    return http.post(`/agents/${id}/messages/${messageId}/feedbacks`, { rating });
  },
};
