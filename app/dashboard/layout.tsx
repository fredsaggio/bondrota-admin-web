import { AuthGuard } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><AdminShell>{children}</AdminShell></AuthGuard>;
}
