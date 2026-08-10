'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BusFront, Database, LayoutDashboard, LogOut, Map, Menu, PanelLeftClose, PanelLeftOpen, Route, X } from 'lucide-react';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { config } from '@/shared/infrastructure/config/config-api';

const navigation = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/cadastros', label: 'Cadastros', icon: Database },
  { href: '/dashboard/operacao', label: 'Operação', icon: Route },
  { href: '/dashboard/monitoramento', label: 'Monitoramento', icon: Map },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [baseCity, setBaseCity] = useState('Operação local');

  useEffect(() => {
    config.get().then((value) => setBaseCity(value.cidade_base)).catch(() => undefined);
  }, []);

  const sidebar = (
    <aside className={`flex h-full flex-col bg-[#192844] text-white transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-[244px]'}`}>
      <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#426fa8]">
          <BusFront size={21} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-extrabold">BondRota</p>
            <p className="truncate text-[10px] uppercase text-blue-200">Administração</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {!collapsed && <p className="mb-3 px-2 text-[10px] font-bold uppercase text-blue-300/60">Menu principal</p>}
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={`flex min-h-[42px] items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? 'bg-[#365884] text-white' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#426fa8] text-xs font-bold">A</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Administrador</p>
              <p className="truncate text-[10px] text-slate-400">ID {session?.userId}</p>
            </div>
          </div>
        )}
        <button className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-300 hover:bg-white/7 hover:text-white" onClick={logout} title={collapsed ? 'Sair' : undefined}>
          <LogOut size={17} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#f2f5f8]">
      <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/45" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[244px]">{sidebar}</div>
          <button className="icon-btn absolute left-[254px] top-3 border-0 bg-white" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dfe5ed] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="icon-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button>
            <button className="icon-btn hidden lg:grid" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div>
              <p className="text-sm font-bold text-[#1b2940]">Central de controle</p>
              <p className="text-[11px] text-slate-500">{baseCity}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Image src="/images/icone_aplicativo_pequeno.png" alt="BondRota" width={34} height={34} className="h-8 w-8 object-contain" />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">Admin</p>
              <p className="text-[10px] text-slate-500">Sessão protegida</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
