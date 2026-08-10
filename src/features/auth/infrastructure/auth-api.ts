import { api } from '@/shared/infrastructure/http/api-client';

export async function authenticateAdmin(email: string, senha: string) {
  return api<{ token: string }>('/admin/login', {
    method: 'POST',
    body: { email, senha },
    auth: false,
  });
}
