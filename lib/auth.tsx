'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearToken, getToken, setToken } from '@/lib/api';

interface Claims {
  user_id: number;
  role: string;
  exp: number;
}

interface Session {
  userId: number;
  role: string;
  expiresAt: number;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login(email: string, senha: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): Claims | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as Claims;
  } catch {
    return null;
  }
}

function readSession(): Session | null {
  const token = getToken();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims || claims.role !== 'admin' || claims.exp * 1000 <= Date.now()) {
    clearToken();
    return null;
  }
  return { userId: claims.user_id, role: claims.role, expiresAt: claims.exp * 1000 };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
    router.replace('/');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const current = readSession();
      setSession(current);
      setLoading(false);
      if (!current && pathname.startsWith('/dashboard')) router.replace('/');
      if (current && pathname === '/') router.replace('/dashboard');
    });
    return () => { cancelled = true; };
  }, [pathname, router]);

  useEffect(() => {
    window.addEventListener('bondrota:unauthorized', logout);
    return () => window.removeEventListener('bondrota:unauthorized', logout);
  }, [logout]);

  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [logout, session]);

  const login = useCallback(async (email: string, senha: string) => {
    const response = await api<{ token: string }>('/admin/login', {
      method: 'POST',
      body: { email, senha },
      auth: false,
    });
    setToken(response.token);
    const nextSession = readSession();
    if (!nextSession) throw new Error('A API não retornou uma sessão administrativa válida.');
    setSession(nextSession);
    router.replace('/dashboard');
  }, [router]);

  const value = useMemo(() => ({ session, loading, login, logout }), [session, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return value;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading || !session) {
    return (
      <div className="app-loader" role="status">
        <span className="spinner" />
        <span>Preparando o painel</span>
      </div>
    );
  }
  return children;
}
