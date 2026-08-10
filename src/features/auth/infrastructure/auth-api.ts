import { api } from '@/shared/infrastructure/http/api-client';
import type { AdminSession } from '@/features/auth/domain/session';

interface AdminSessionResponse {
  user_id: number;
  role: string;
  expires_at: number;
}

export async function authenticateAdmin(email: string, senha: string) {
  await api<void>('/admin/login', {
    method: 'POST',
    body: { email, senha },
    auth: false,
    headers: { 'X-Admin-Session-Mode': 'cookie' },
  });
}

export async function fetchAdminSession(): Promise<AdminSession | null> {
  const response = await api<AdminSessionResponse>('/admin/session', { auth: false });
  if (response.role !== 'admin' || response.expires_at <= Date.now()) return null;
  return {
    userId: response.user_id,
    role: 'admin',
    expiresAt: response.expires_at,
  };
}

export async function terminateAdminSession() {
  return api<void>('/admin/logout', { method: 'POST', auth: false });
}
