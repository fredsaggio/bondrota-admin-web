'use client';

import { useState, type FormEvent } from 'react';
import { Modal, Notice } from '@/shared/presentation/components/ui';
import { changeAdminPassword } from '@/features/auth/infrastructure/auth-api';

/** Mesma regra da API (`admin.MinPasswordLen`) e do `cmd/admin`. */
const MIN_LENGTH = 8;

export function ChangePasswordDialog({ onClose }: { onClose(): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const atual = String(data.get('senha_atual') ?? '');
    const nova = String(data.get('nova_senha') ?? '');
    const confirmacao = String(data.get('confirmacao') ?? '');

    if (nova.length < MIN_LENGTH) {
      setError(`A nova senha precisa de pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (nova !== confirmacao) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    if (nova === atual) {
      setError('A nova senha precisa ser diferente da atual.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await changeAdminPassword(atual, nova);
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível trocar a senha.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="Senha alterada" onClose={onClose}>
        <div className="space-y-4 p-5">
          <Notice type="success">Sua senha foi alterada e esta sessão continua ativa.</Notice>
          {/* Os JWTs não têm revogação: sessões abertas em outros aparelhos seguem
              valendo até expirar. Melhor dizer do que deixar a pessoa supor. */}
          <p className="text-xs text-slate-500">
            Se você estiver logado em outro navegador ou aparelho, aquela sessão continuará
            aberta até expirar sozinha. Use &quot;Sair&quot; lá para encerrá-la na hora.
          </p>
        </div>
        <footer className="flex justify-end border-t border-[#e4e9ef] px-5 py-4">
          <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
        </footer>
      </Modal>
    );
  }

  return (
    <Modal title="Trocar senha" description="Confirme a senha atual para definir uma nova." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4 p-5">
          <Field label="Senha atual" name="senha_atual" autoComplete="current-password" />
          <Field label="Nova senha" name="nova_senha" autoComplete="new-password" minLength={MIN_LENGTH} hint={`Mínimo de ${MIN_LENGTH} caracteres.`} />
          <Field label="Confirmar nova senha" name="confirmacao" autoComplete="new-password" minLength={MIN_LENGTH} />
          {error && <Notice type="error">{error}</Notice>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e4e9ef] px-5 py-4">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando...' : 'Trocar senha'}</button>
        </footer>
      </form>
    </Modal>
  );
}

function Field({ label, name, autoComplete, minLength, hint }: { label: string; name: string; autoComplete: string; minLength?: number; hint?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>{label}<b className="ml-1 text-red-500">*</b></label>
      <input className="field" id={name} type="password" name={name} autoComplete={autoComplete} minLength={minLength} required />
      {hint && <small className="mt-1 block text-xs text-slate-500">{hint}</small>}
    </div>
  );
}
