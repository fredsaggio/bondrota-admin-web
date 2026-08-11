'use client';

import { useCallback, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal, Notice, PageHeader, SearchField } from '@/shared/presentation/components/ui';
import { RegistryForm } from '@/features/registrations/presentation/registry-form';
import { useResource } from '@/shared/application/use-resource';
import { loadRegistry, removeRegistryRecord, saveRegistryRecord } from '@/features/registrations/application/manage-registry';
import type { EntityKey, RegistryPageData, RegistryRecord } from '@/features/registrations/domain/registry';

interface EntityDefinition {
  key: EntityKey;
  label: string;
  singular: string;
  /** Gênero gramatical de `singular`, usado para concordar "Novo"/"Nova". */
  genero: 'm' | 'f';
  columns: Array<{ key: string; label: string }>;
}

const entities: EntityDefinition[] = [
  { key: 'destinos', label: 'Destinos', singular: 'destino', genero: 'm', columns: [{ key: 'nome', label: 'Nome' }, { key: 'rua', label: 'Endereço' }, { key: 'municipio_id', label: 'Município IBGE' }] },
  { key: 'paradas', label: 'Paradas', singular: 'parada', genero: 'f', columns: [{ key: 'nome', label: 'Nome' }, { key: 'latitude', label: 'Latitude' }, { key: 'longitude', label: 'Longitude' }] },
  { key: 'rotas', label: 'Rotas internas', singular: 'rota interna', genero: 'f', columns: [{ key: 'id', label: 'Rota' }, { key: 'paradas_resumo', label: 'Sequência de paradas' }] },
  { key: 'horarios', label: 'Horários', singular: 'horário', genero: 'm', columns: [{ key: 'municipio_destino_id', label: 'Município IBGE' }, { key: 'turno', label: 'Turno' }, { key: 'horario_ida', label: 'Ida' }, { key: 'horario_volta', label: 'Volta' }] },
  { key: 'veiculos', label: 'Veículos', singular: 'veículo', genero: 'm', columns: [{ key: 'placa', label: 'Placa' }, { key: 'modelo', label: 'Modelo' }, { key: 'categoria_label', label: 'Categoria' }, { key: 'capacidade', label: 'Capacidade' }, { key: 'status', label: 'Status' }] },
  { key: 'motoristas', label: 'Motoristas', singular: 'motorista', genero: 'm', columns: [{ key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'turno', label: 'Turno' }, { key: 'municipio_trabalho_id', label: 'Cidade de trabalho' }] },
  { key: 'clientes', label: 'Clientes', singular: 'cliente', genero: 'm', columns: [{ key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'telefone', label: 'Telefone' }, { key: 'data_nasc', label: 'Nascimento' }] },
  { key: 'vinculos', label: 'Vínculos', singular: 'vínculo', genero: 'm', columns: [{ key: 'cliente_nome', label: 'Cliente' }, { key: 'tipo', label: 'Tipo' }, { key: 'turno', label: 'Turno' }, { key: 'destino_id', label: 'Destino' }, { key: 'validade', label: 'Validade' }] },
];

function newLabel(definition: EntityDefinition) {
  return `${definition.genero === 'f' ? 'Nova' : 'Novo'} ${definition.singular}`;
}

export function RegistrationsPage() {
  const [active, setActive] = useState<EntityKey>('destinos');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RegistryRecord | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<RegistryRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const definition = entities.find((item) => item.key === active)!;

  const loader = useCallback(() => loadRegistry(active), [active]);
  const resource = useResource<RegistryPageData>(loader);

  const filtered = useMemo(() => {
    const records = resource.data?.records ?? [];
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return records;
    // Busca só nas colunas realmente visíveis na tabela (+ o #id, sempre mostrado).
    // JSON.stringify do registro inteiro batia até com nomes de campo internos.
    return records.filter((record) => {
      const haystack = [String(record.id), ...definition.columns.map((column) => {
        const raw = record[column.key];
        return raw == null ? '' : String(raw);
      })].join(' ').toLocaleLowerCase('pt-BR');
      return haystack.includes(query);
    });
  }, [resource.data, search, definition]);

  function changeEntity(key: EntityKey) {
    setActive(key);
    setSearch('');
    setNotice('');
  }

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setFormError('');
    try {
      await saveRegistryRecord(active, editing ?? null, payload);
      setEditing(undefined);
      const salvo = definition.genero === 'f' ? 'salva' : 'salvo';
      setNotice(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} ${salvo} com sucesso.`);
      await resource.reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError('');
    try {
      await removeRegistryRecord(active, deleting);
      setDeleting(null);
      setNotice('Registro removido com sucesso.');
      await resource.reload();
    } catch (reason) {
      // O diálogo continua aberto para exibir o motivo. Uma exclusão recusada por
      // uso do registro (409) é o caso mais comum e precisa ficar visível.
      setNotice('');
      setDeleteError(reason instanceof Error ? reason.message : 'Não foi possível remover.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-7">
      <PageHeader title="Cadastros" subtitle="Configure os recursos usados pelo planejamento e pela operação" action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormError(''); }}><Plus size={16} />{newLabel(definition)}</button>} />

      <div className="panel overflow-x-auto p-1.5">
        <div className="flex min-w-max gap-1">
          {entities.map((item) => <button key={item.key} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${active === item.key ? 'bg-[#426fa8] text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => changeEntity(item.key)}>{item.label}</button>)}
        </div>
      </div>

      {notice && <Notice type="success">{notice}</Notice>}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e4e9ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold">{definition.label}</h2><p className="mt-1 text-xs text-slate-500">{resource.data?.records.length ?? 0} registros</p></div>
          <SearchField value={search} onChange={setSearch} placeholder={`Pesquisar em ${definition.label.toLowerCase()}`} />
        </div>
        {resource.loading ? <LoadingRows /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th>{definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="w-24">Ações</th></tr></thead><tbody>
            {filtered.map((record) => <tr key={record.id}><td className="font-semibold">{record.id}</td>{definition.columns.map((column) => <td key={column.key}>{renderCell(column.key, record[column.key])}</td>)}<td><div className="flex gap-1"><button className="icon-btn !h-8 !w-8" onClick={() => { setEditing(record); setFormError(''); }} title="Editar"><Edit3 size={14} /></button><button className="icon-btn !h-8 !w-8 text-red-500" onClick={() => { setDeleting(record); setDeleteError(''); }} title="Excluir"><Trash2 size={14} /></button></div></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {editing !== undefined && resource.data && <Modal title={editing ? `Editar ${definition.singular}` : newLabel(definition)} description="Os campos marcados com * são obrigatórios." onClose={() => setEditing(undefined)} wide={active === 'rotas'}><RegistryForm entity={active} record={editing} references={resource.data.references} busy={busy} error={formError} onSubmit={save} onCancel={() => setEditing(undefined)} /></Modal>}
      {deleting && <ConfirmDialog title={`Excluir ${definition.singular}`} message="Esta ação é permanente e pode ser recusada caso o registro esteja sendo usado por outra entidade." busy={busy} error={deleteError} onClose={() => { setDeleting(null); setDeleteError(''); }} onConfirm={() => void remove()} />}
    </div>
  );
}

function renderCell(key: string, raw: unknown) {
  const value = raw == null || raw === '' ? '—' : String(raw);
  if (key === 'status') {
    const tone = value === 'ativo' ? 'green' : value === 'manutencao' ? 'amber' : 'red';
    return <span className={`badge badge-${tone}`}>{value === 'manutencao' ? 'Manutenção' : `${value[0].toUpperCase()}${value.slice(1)}`}</span>;
  }
  if (key === 'turno') return <span className="badge badge-blue">{value}</span>;
  if (key === 'tipo') return <span className="capitalize">{value}</span>;
  if (key === 'capacidade') return `${value} lugares`;
  return <span className="block max-w-[340px] truncate" title={value}>{value}</span>;
}
