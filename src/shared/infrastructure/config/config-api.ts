import { api } from '@/shared/infrastructure/http/api-client';
import type { AppConfig } from '@/shared/domain/transport';

export const config = {
  get: () => api<AppConfig>('/config', { auth: false }),
};
