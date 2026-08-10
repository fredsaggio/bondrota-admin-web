import { authenticateAdmin, fetchAdminSession, terminateAdminSession } from '@/features/auth/infrastructure/auth-api';

export async function loadAdminSession() {
  return fetchAdminSession();
}

export async function loginAdmin(email: string, senha: string) {
  await authenticateAdmin(email, senha);
  const session = await fetchAdminSession();
  if (!session) throw new Error('A API não retornou uma sessão administrativa válida.');
  return session;
}

export async function logoutAdmin() {
  await terminateAdminSession();
}
