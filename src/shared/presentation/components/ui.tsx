'use client';

import { AlertCircle, Inbox, Search, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold text-[#182235]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Pesquisar' }: { value: string; onChange(value: string): void; placeholder?: string }) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="field pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function LoadingRows() {
  return <div className="grid min-h-48 place-items-center"><span className="spinner" /></div>;
}

export function EmptyState({ title = 'Nenhum registro encontrado', description }: { title?: string; description?: string }) {
  return (
    <div className="grid min-h-52 place-content-center justify-items-center px-4 text-center">
      <Inbox size={28} className="mb-2 text-slate-300" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-400">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?(): void }) {
  return (
    <div className="m-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <span className="flex items-center gap-2"><AlertCircle size={17} />{message}</span>
      {retry && <button className="font-semibold underline" onClick={retry}>Tentar novamente</button>}
    </div>
  );
}

export function Modal({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: ReactNode; onClose(): void; wide?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sectionRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Prende o Tab dentro do modal: sem isso, o foco escapa pro conteudo
      // por baixo do overlay assim que passa do ultimo elemento focavel.
      if (event.key !== 'Tab' || !sectionRef.current) return;
      const focusable = sectionRef.current.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0 bg-slate-950/50" aria-label="Fechar" onClick={onClose} />
      <section ref={sectionRef} tabIndex={-1} className={`panel relative flex max-h-[92vh] w-full flex-col overflow-hidden outline-none ${wide ? 'max-w-3xl' : 'max-w-xl'}`} role="dialog" aria-modal="true">
        <header className="flex items-start justify-between gap-4 border-b border-[#e4e9ef] px-5 py-4">
          <div><h2 className="text-base font-bold">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
          <button className="icon-btn shrink-0" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmDialog({ title, message, busy, error, onConfirm, onClose }: { title: string; message: string; busy?: boolean; error?: string; onConfirm(): void; onClose(): void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="p-5">
        <p className="text-sm leading-6 text-slate-600">{message}</p>
        {/* A falha precisa aparecer aqui dentro: o overlay do modal cobre a página. */}
        {error && <div className="mt-4"><Notice type="error">{error}</Notice></div>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>{error ? 'Fechar' : 'Cancelar'}</button>
          <button className="btn btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Removendo...' : error ? 'Tentar novamente' : 'Confirmar exclusão'}</button>
        </div>
      </div>
    </Modal>
  );
}

export function Notice({ type, children }: { type: 'success' | 'error'; children: ReactNode }) {
  return <div className={`rounded-md border px-3 py-2 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{children}</div>;
}
