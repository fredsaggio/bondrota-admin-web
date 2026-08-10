import type { Metadata } from 'next';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'BondRota Admin',
  description: 'Painel de gestão do transporte universitário BondRota',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
