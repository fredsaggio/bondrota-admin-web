'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminSession } from '@/features/auth/domain/session';
import { loadAdminSession, loginAdmin, logoutAdmin } from '@/features/auth/application/admin-session';

interface AuthContextValue {
  session: AdminSession | null;
  loading: boolean;
  login(email: string, senha: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setSession(null);
    router.replace('/');
  }, [router]);

  const logout = useCallback(() => {
    void logoutAdmin().finally(clearSession);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    loadAdminSession()
      .catch(() => null)
      .then((current) => {
        if (cancelled) return;
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
    const nextSession = await loginAdmin(email, senha);
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
