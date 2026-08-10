import { decodeAdminSession } from '@/features/auth/domain/session';
import { authenticateAdmin } from '@/features/auth/infrastructure/auth-api';
import { clearToken, getToken, setToken } from '@/shared/infrastructure/browser/token-storage';

export function loadStoredAdminSession() {
  const token = getToken();
  if (!token) return null;
  const session = decodeAdminSession(token);
  if (!session) clearToken();
  return session;
}

export async function loginAdmin(email: string, senha: string) {
  const response = await authenticateAdmin(email, senha);
  setToken(response.token);
  const session = loadStoredAdminSession();
  if (!session) throw new Error('A API não retornou uma sessão administrativa válida.');
  return session;
}

export function removeAdminSession() {
  clearToken();
}
