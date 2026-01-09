import http from '@/lib/http';

export interface Conversation {
  id: string;
  name: string;
  inputs: unknown;
  status: string;
  created_at: number;
}

export interface Message {
  id: string;
  query: string;
  answer: string;
  feedback?: {
    rating: 'like' | 'dislike' | null;
  };
  message_files?: Array<{
    id: string;
    name: string;
    type: string;
    belongs_to: 'user' | 'assistant';
  }>;
}

export interface UploadResponse {
  id: string;
  name: string;
  size: number;
  extension: string;
  mime_type: string;
  created_by: string;
  created_at: number;
}

export const chatApi = {
  getConversations: (last_id?: string, limit: number = 30) => {
    return http.get<unknown, { data: Conversation[], has_more: boolean, limit: number }>('/chat/conversations', {
      params: { last_id, limit }
    });
  },

  deleteConversation: (id: string) => {
    return http.delete(`/chat/conversations/${id}`);
  },

  getMessages: (conversationId: string) => {
    return http.get<unknown, { data: Message[] }>('/chat/messages', {
      params: { conversation_id: conversationId },
    });
  },

  sendFeedback: (messageId: string, rating: 'like' | 'dislike' | null) => {
    return http.post(`/chat/messages/${messageId}/feedbacks`, { rating });
  },

  stopGeneration: (taskId: string) => {
    return http.post(`/chat/messages/${taskId}/stop`);
  },

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<unknown, UploadResponse>('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Endpoint for streaming
  messageEndpoint: '/api/chat/message',
};
