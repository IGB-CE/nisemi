import { api } from './api';

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocked: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export const blocks = {
  list: (token: string) => api.get<Block[]>('/api/v1/blocks', token),
  create: (blockedId: string, token: string) => api.post<Block>('/api/v1/blocks', { blockedId }, token),
  remove: (blockedId: string, token: string) => api.delete<{ ok: true }>(`/api/v1/blocks/${blockedId}`, token),
};
