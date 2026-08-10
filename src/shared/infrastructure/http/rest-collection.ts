import { api } from '@/shared/infrastructure/http/api-client';

export type JsonRecord = Record<string, unknown>;

export function createRestCollection<T>(path: string) {
  return {
    list: () => api<T[]>(`${path}/`),
    get: (id: number) => api<T>(`${path}/${id}`),
    create: (payload: JsonRecord) => api<T>(`${path}/`, { method: 'POST', body: payload }),
    update: (id: number, payload: JsonRecord) => api<T>(`${path}/${id}`, { method: 'PUT', body: payload }),
    remove: (id: number) => api<void>(`${path}/${id}`, { method: 'DELETE' }),
  };
}
