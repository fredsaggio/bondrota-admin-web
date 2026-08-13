import { api } from '@/shared/infrastructure/http/api-client';

export type JsonRecord = Record<string, unknown>;
type ResourceId = string | number;

export function createRestCollection<T extends { id: ResourceId }>(path: string) {
  return {
    list: () => api<T[]>(`${path}/`),
    get: (id: T['id']) => api<T>(`${path}/${id}`),
    create: (payload: JsonRecord) => api<T>(`${path}/`, { method: 'POST', body: payload }),
    update: (id: T['id'], payload: JsonRecord) => api<T>(`${path}/${id}`, { method: 'PUT', body: payload }),
    remove: (id: T['id']) => api<void>(`${path}/${id}`, { method: 'DELETE' }),
  };
}
