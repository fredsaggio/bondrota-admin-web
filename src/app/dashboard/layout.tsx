import { AuthGuard } from '@/features/auth/presentation/auth-provider';
import { AdminShell } from '@/features/shell/presentation/admin-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><AdminShell>{children}</AdminShell></AuthGuard>;
}
