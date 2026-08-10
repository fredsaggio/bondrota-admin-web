'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { LoginScene } from '@/components/login-scene';
import { useAuth } from '@/lib/auth';

const stars = [
  [8, 12], [15, 8], [22, 18], [30, 5], [38, 14], [45, 9], [52, 20],
  [60, 6], [68, 15], [75, 10], [82, 18], [90, 7], [5, 28], [18, 35],
  [27, 40], [35, 25], [42, 38], [50, 30], [58, 42], [65, 27], [72, 36],
  [80, 22], [88, 40], [95, 30], [3, 20], [11, 42], [24, 15], [48, 8],
  [70, 44], [85, 12], [93, 38], [2, 44], [16, 22], [33, 44], [55, 18],
  [77, 42], [91, 20], [7, 38], [41, 15], [62, 40],
];

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), senha);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="app-loader"><span className="spinner" /></div>;

  return (
    <main className="login-stage relative flex h-screen w-full items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        {stars.map(([left, top], index) => {
          const size = index % 3 === 0 ? 2.5 : index % 3 === 1 ? 1.5 : 2;
          const opacity = index % 4 === 0 ? 0.7 : index % 4 === 1 ? 0.4 : index % 4 === 2 ? 0.55 : 0.3;
          return <i key={`${left}-${top}`} className="absolute rounded-full bg-white" style={{ width: size, height: size, left: `${left}%`, top: `${top}%`, opacity }} />;
        })}
      </div>

      <LoginScene />

      <section className="login-ticket-float relative z-20 w-[88vw] max-w-[420px] sm:max-w-[460px] lg:w-[38vw] lg:max-w-[560px]">
        <div className="ticket-cutout-mask flex min-h-[48vh] flex-col overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.35),0_4px_20px_rgba(0,0,0,.2)]">
          <header className="login-ticket-header relative flex flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
            <Image src="/images/icones/bigBus.png" alt="Ícone de ônibus" width={48} height={48} className="mb-4 mt-1 h-12 w-12" priority />
            <h1 className="text-center text-xl font-bold uppercase leading-tight text-white sm:text-2xl sm:tracking-[.12em]">Sistema BondRota</h1>
            <p className="mt-1 text-center text-xs uppercase text-white/60 sm:text-sm sm:tracking-[.18em]">Tela de Login</p>
          </header>

          <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-6 bg-[#f2f3f5] px-6 py-8 sm:gap-9 sm:px-10 sm:py-10 lg:px-15">
            <div className="login-ticket-divider" />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Seu E-mail</span>
              <span className="relative flex items-center">
                <Mail size={18} className="pointer-events-none absolute left-3 text-gray-400" />
                <input id="email" type="email" placeholder="email@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-100 py-3 pr-4 pl-10 text-lg text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-300 focus:outline-none" autoComplete="email" required />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Sua Senha</span>
              <span className="relative flex items-center">
                <LockKeyhole size={18} className="pointer-events-none absolute left-3 text-gray-400" />
                <input id="senha" type="password" placeholder="Senha" value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-100 py-3 pr-4 pl-10 text-lg text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-300 focus:outline-none" autoComplete="current-password" required />
              </span>
            </label>

            {error && <p className="-my-3 text-center text-sm font-medium text-red-500">{error}</p>}

            <button type="submit" disabled={submitting} className="login-primary-button flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 text-lg font-bold tracking-wide text-[#925802] active:scale-[.98]">
              <span>{submitting ? 'Entrando...' : 'Entrar Agora'}</span>
              {!submitting && <Image src="/images/icones/bus.png" alt="" width={24} height={24} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
