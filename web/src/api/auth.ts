import http from '@/lib/http';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
  };
}

export const authApi = {
  login: (data: LoginParams) => {
    return http.post<unknown, AuthResponse>('/auth/login', data);
  },

  register: (data: RegisterParams) => {
    return http.post<unknown, AuthResponse>('/auth/register', data);
  },
};
