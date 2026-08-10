'use client';

import { useCallback, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal, Notice, PageHeader, SearchField } from '@/components/ui';
import { RegistryForm, type EntityKey, type RegistryRecord } from '@/components/registry-form';
import { useResource } from '@/lib/use-resource';
import { admins, clientes, destinos, horarios, motoristas, paradas, rotasInternas, veiculos, vinculos } from '@/services/bondrota';
import type { Cliente, Destino, Parada, RotaInterna } from '@/types/domain';

interface EntityDefinition {
  key: EntityKey;
  label: string;
  singular: string;
  columns: Array<{ key: string; label: string }>;
}

const entities: EntityDefinition[] = [
  { key: 'destinos', label: 'Destinos', singular: 'destino', columns: [{ key: 'nome', label: 'Nome' }, { key: 'rua', label: 'Endereço' }, { key: 'municipio_id', label: 'Município IBGE' }] },
  { key: 'paradas', label: 'Paradas', singular: 'parada', columns: [{ key: 'nome', label: 'Nome' }, { key: 'latitude', label: 'Latitude' }, { key: 'longitude', label: 'Longitude' }] },
  { key: 'rotas', label: 'Rotas internas', singular: 'rota interna', columns: [{ key: 'id', label: 'Rota' }, { key: 'paradas_resumo', label: 'Sequência de paradas' }] },
  { key: 'horarios', label: 'Horários', singular: 'horário', columns: [{ key: 'municipio_destino_id', label: 'Município IBGE' }, { key: 'turno', label: 'Turno' }, { key: 'horario_ida', label: 'Ida' }, { key: 'horario_volta', label: 'Volta' }] },
  { key: 'veiculos', label: 'Veículos', singular: 'veículo', columns: [{ key: 'placa', label: 'Placa' }, { key: 'modelo', label: 'Modelo' }, { key: 'categoria_label', label: 'Categoria' }, { key: 'capacidade', label: 'Capacidade' }, { key: 'status', label: 'Status' }] },
  { key: 'motoristas', label: 'Motoristas', singular: 'motorista', columns: [{ key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'turno', label: 'Turno' }, { key: 'municipio_trabalho_id', label: 'Cidade de trabalho' }] },
  { key: 'clientes', label: 'Clientes', singular: 'cliente', columns: [{ key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'telefone', label: 'Telefone' }, { key: 'data_nasc', label: 'Nascimento' }] },
  { key: 'vinculos', label: 'Vínculos', singular: 'vínculo', columns: [{ key: 'cliente_nome', label: 'Cliente' }, { key: 'tipo', label: 'Tipo' }, { key: 'turno', label: 'Turno' }, { key: 'destino_id', label: 'Destino' }, { key: 'validade', label: 'Validade' }] },
  { key: 'admins', label: 'Administradores', singular: 'administrador', columns: [{ key: 'email', label: 'E-mail' }] },
];

interface PageData {
  records: RegistryRecord[];
  references: { paradas: Parada[]; destinos: Destino[]; rotas: RotaInterna[]; clientes: Cliente[] };
}

export default function CadastrosPage() {
  const [active, setActive] = useState<EntityKey>('destinos');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RegistryRecord | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<RegistryRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const definition = entities.find((item) => item.key === active)!;

  const loader = useCallback(async () => {
    const [stopItems, destinationItems, routeItems, clientItems, records] = await Promise.all([
      paradas.list(), destinos.list(), rotasInternas.list(), clientes.list(), loadEntity(active),
    ]);
    return { records, references: { paradas: stopItems, destinos: destinationItems, rotas: routeItems, clientes: clientItems } };
  }, [active]);
  const resource = useResource<PageData>(loader);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return resource.data?.records ?? [];
    return (resource.data?.records ?? []).filter((record) => JSON.stringify(record).toLocaleLowerCase('pt-BR').includes(query));
  }, [resource.data, search]);

  function changeEntity(key: EntityKey) {
    setActive(key);
    setSearch('');
    setNotice('');
  }

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setFormError('');
    try {
      await saveEntity(active, editing ?? null, payload);
      setEditing(undefined);
      setNotice(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} salvo com sucesso.`);
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
    try {
      await removeEntity(active, deleting);
      setDeleting(null);
      setNotice('Registro removido com sucesso.');
      await resource.reload();
    } catch (reason) {
      setNotice('');
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível remover.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-7">
      <PageHeader title="Cadastros" subtitle="Configure os recursos usados pelo planejamento e pela operação" action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormError(''); }}><Plus size={16} />Novo {definition.singular}</button>} />

      <div className="panel overflow-x-auto p-1.5">
        <div className="flex min-w-max gap-1">
          {entities.map((item) => <button key={item.key} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${active === item.key ? 'bg-[#426fa8] text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => changeEntity(item.key)}>{item.label}</button>)}
        </div>
      </div>

      {notice && <Notice type="success">{notice}</Notice>}
      {formError && editing === undefined && <Notice type="error">{formError}</Notice>}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e4e9ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold">{definition.label}</h2><p className="mt-1 text-xs text-slate-500">{resource.data?.records.length ?? 0} registros</p></div>
          <SearchField value={search} onChange={setSearch} placeholder={`Pesquisar em ${definition.label.toLowerCase()}`} />
        </div>
        {resource.loading ? <LoadingRows /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : filtered.length === 0 ? <EmptyState /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th>{definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="w-24">Ações</th></tr></thead><tbody>
            {filtered.map((record) => <tr key={record.id}><td className="font-semibold">{record.id}</td>{definition.columns.map((column) => <td key={column.key}>{renderCell(column.key, record[column.key])}</td>)}<td><div className="flex gap-1"><button className="icon-btn !h-8 !w-8" onClick={() => { setEditing(record); setFormError(''); }} title="Editar"><Edit3 size={14} /></button><button className="icon-btn !h-8 !w-8 text-red-500" onClick={() => setDeleting(record)} title="Excluir"><Trash2 size={14} /></button></div></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {editing !== undefined && resource.data && <Modal title={editing ? `Editar ${definition.singular}` : `Novo ${definition.singular}`} description="Os campos marcados com * são obrigatórios." onClose={() => setEditing(undefined)} wide={active === 'rotas'}><RegistryForm entity={active} record={editing} references={resource.data.references} busy={busy} error={formError} onSubmit={save} onCancel={() => setEditing(undefined)} /></Modal>}
      {deleting && <ConfirmDialog title={`Excluir ${definition.singular}`} message="Esta ação é permanente e pode ser recusada caso o registro esteja sendo usado por outra entidade." busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </div>
  );
}

async function loadEntity(entity: EntityKey): Promise<RegistryRecord[]> {
  switch (entity) {
    case 'destinos': return (await destinos.list()).map((item) => ({ ...item }));
    case 'paradas': return (await paradas.list()).map((item) => ({ ...item }));
    case 'rotas': return (await rotasInternas.list()).map((item) => ({ ...item, paradas_resumo: item.paradas.sort((a, b) => a.ordem - b.ordem).map((stop) => stop.nome).join(' → ') }));
    case 'horarios': return (await horarios.list()).map((item) => ({ ...item }));
    case 'veiculos': return (await veiculos.list()).map((item) => ({ ...item, categoria_label: ({ executivo: 'Executivo', escolar: 'Escolar', carro_7_lugares: 'Carro 7 lugares' } as Record<string, string>)[item.categoria] }));
    case 'motoristas': return (await motoristas.list()).map((item) => ({ ...item }));
    case 'clientes': return (await clientes.list()).map((item) => ({ ...item }));
    case 'admins': return (await admins.list()).map((item) => ({ ...item }));
    case 'vinculos': {
      const clientItems = await clientes.list();
      const groups = await Promise.all(clientItems.map(async (client) => (await vinculos.list(client.id)).map((item) => ({ ...item, cliente_nome: client.nome }))));
      return groups.flat();
    }
  }
}

async function saveEntity(entity: EntityKey, record: RegistryRecord | null, payload: Record<string, unknown>) {
  const id = record?.id;
  switch (entity) {
    case 'destinos': return id ? destinos.update(id, payload) : destinos.create(payload);
    case 'paradas': return id ? paradas.update(id, payload) : paradas.create(payload);
    case 'horarios': return id ? horarios.update(id, payload) : horarios.create(payload);
    case 'veiculos': return id ? veiculos.update(id, payload) : veiculos.create(payload);
    case 'motoristas': return id ? motoristas.update(id, payload) : motoristas.create(payload);
    case 'clientes': return id ? clientes.update(id, payload) : clientes.create(payload);
    case 'admins': return id ? admins.update(id, payload) : admins.create(payload);
    case 'rotas': {
      const stopIds = payload.parada_ids as number[];
      if (!stopIds.length) throw new Error('Adicione pelo menos uma parada à rota.');
      return id ? rotasInternas.update(id, stopIds) : rotasInternas.create(stopIds);
    }
    case 'vinculos': {
      const clienteId = Number(payload.cliente_id);
      const body = { ...payload }; delete body.cliente_id;
      return id ? vinculos.update(clienteId, id, body) : vinculos.create(clienteId, body);
    }
  }
}

async function removeEntity(entity: EntityKey, record: RegistryRecord) {
  switch (entity) {
    case 'destinos': return destinos.remove(record.id);
    case 'paradas': return paradas.remove(record.id);
    case 'rotas': return rotasInternas.remove(record.id);
    case 'horarios': return horarios.remove(record.id);
    case 'veiculos': return veiculos.remove(record.id);
    case 'motoristas': return motoristas.remove(record.id);
    case 'clientes': return clientes.remove(record.id);
    case 'admins': return admins.remove(record.id);
    case 'vinculos': return vinculos.remove(Number(record.cliente_id), record.id);
  }
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
