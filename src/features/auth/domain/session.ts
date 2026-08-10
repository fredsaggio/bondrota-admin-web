export interface AdminSession {
  userId: number;
  role: 'admin';
  expiresAt: number;
}

interface TokenClaims {
  user_id: number;
  role: string;
  exp: number;
}

export function decodeAdminSession(token: string): AdminSession | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as TokenClaims;
    if (claims.role !== 'admin' || claims.exp * 1000 <= Date.now()) return null;
    return { userId: claims.user_id, role: 'admin', expiresAt: claims.exp * 1000 };
  } catch {
    return null;
  }
}
