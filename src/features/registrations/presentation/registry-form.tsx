'use client';

import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, FileUp, Plus, Trash2 } from 'lucide-react';
import { municipios, storage } from '@/features/registrations/infrastructure/registrations-api';
import type { Municipio, Parada } from '@/features/registrations/domain/models';
import type { EntityKey, RegistryRecord, RegistryReferences } from '@/features/registrations/domain/registry';

interface Props {
  entity: EntityKey;
  record: RegistryRecord | null;
  references: RegistryReferences;
  busy: boolean;
  error: string;
  onSubmit(payload: Record<string, unknown>): Promise<void>;
  onCancel(): void;
}

const turnos = [
  ['MT', 'Matutino'], ['VT', 'Vespertino'], ['NT', 'Noturno'], ['IN', 'Integral'],
];

const value = (record: RegistryRecord | null, key: string) => {
  const current = record?.[key];
  return current == null ? '' : String(current);
};

export function RegistryForm({ entity, record, references, busy, error, onSubmit, onCancel }: Props) {
  const [routeStops, setRouteStops] = useState<number[]>(() => routeStopIds(record));
  const [photo, setPhoto] = useState(value(record, 'foto'));
  const [comprovante, setComprovante] = useState(value(record, 'comprovante'));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = buildPayload(entity, data, record, routeStops, photo, comprovante);
    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        {entity === 'destinos' && <>
          <Field label="Nome do destino" name="nome" defaultValue={value(record, 'nome')} required span />
          <Field label="Rua / logradouro" name="rua" defaultValue={value(record, 'rua')} required span />
          <MunicipioField defaultMunicipioId={Number(record?.municipio_id ?? 0)} />
          <Field label="Latitude" name="latitude" type="number" step="any" defaultValue={value(record, 'latitude')} required />
          <Field label="Longitude" name="longitude" type="number" step="any" defaultValue={value(record, 'longitude')} required />
        </>}

        {entity === 'paradas' && <>
          <Field label="Nome da parada" name="nome" defaultValue={value(record, 'nome')} required span />
          <Field label="Latitude" name="latitude" type="number" step="any" defaultValue={value(record, 'latitude')} required />
          <Field label="Longitude" name="longitude" type="number" step="any" defaultValue={value(record, 'longitude')} required />
        </>}

        {entity === 'rotas' && <RouteStops stops={references.paradas} selected={routeStops} onChange={setRouteStops} />}

        {entity === 'horarios' && <>
          <MunicipioField defaultMunicipioId={Number(record?.municipio_destino_id ?? 0)} name="municipio_destino_id" />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos.filter(([id]) => id !== 'IN')} required />
          <Field label="Horário de ida" name="horario_ida" type="time" defaultValue={value(record, 'horario_ida').slice(0, 5)} required />
          <Field label="Horário de volta" name="horario_volta" type="time" defaultValue={value(record, 'horario_volta').slice(0, 5)} required />
        </>}

        {entity === 'veiculos' && <>
          <Field label="Placa" name="placa" defaultValue={value(record, 'placa')} required />
          <Field label="Modelo" name="modelo" defaultValue={value(record, 'modelo')} required />
          <Select label="Categoria" name="categoria" defaultValue={value(record, 'categoria')} options={[["executivo", "Executivo - 46 lugares"], ["escolar", "Escolar - 24 lugares"], ["carro_7_lugares", "Carro - 7 lugares"]]} required />
          <Select label="Status" name="status" defaultValue={value(record, 'status') || 'ativo'} options={[["ativo", "Ativo"], ["inativo", "Inativo"], ["manutencao", "Manutenção"]]} required />
          <div className="sm:col-span-2"><p className="field-label">Comodidades</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[['ar_condicionado', 'Ar-condicionado'], ['banheiro', 'Banheiro'], ['persiana', 'Persiana'], ['luz_leitura', 'Luz de leitura'], ['tomada', 'Tomada']].map(([key, label]) => <Checkbox key={key} name={key} label={label} defaultChecked={Boolean(record?.[key])} />)}
          </div></div>
        </>}

        {entity === 'motoristas' && <>
          <Field label="Nome completo" name="nome" defaultValue={value(record, 'nome')} required span />
          {!record && <><Field label="CPF" name="cpf" defaultValue="" required /><Field label="Senha inicial" name="senha" type="password" required /></>}
          <Field label="Telefone" name="telefone" defaultValue={value(record, 'telefone')} />
          <Field label="Data de nascimento" name="data_nasc" type="date" defaultValue={value(record, 'data_nasc')} required />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos} required />
          <MunicipioField defaultMunicipioId={Number(record?.municipio_trabalho_id ?? 0)} name="municipio_trabalho_id" />
          <Field label="Residência" name="residencia" defaultValue={value(record, 'residencia')} span />
          <UploadField label="Foto" bucket="fotos" folder="motoristas" accept="image/*" current={photo} onUploaded={setPhoto} />
        </>}

        {entity === 'clientes' && <>
          <Field label="Nome completo" name="nome" defaultValue={value(record, 'nome')} required span />
          {!record && <><Field label="CPF" name="cpf" required /><Field label="Senha inicial" name="senha" type="password" required /></>}
          <Field label="Telefone" name="telefone" defaultValue={value(record, 'telefone')} />
          <Field label="Data de nascimento" name="data_nasc" type="date" defaultValue={value(record, 'data_nasc')} required />
          <UploadField label="Foto" bucket="fotos" folder="clientes" accept="image/*" current={photo} onUploaded={setPhoto} />
        </>}

        {entity === 'vinculos' && <>
          <Select label="Cliente" name="cliente_id" defaultValue={value(record, 'cliente_id')} options={references.clientes.map((item) => [String(item.id), `${item.nome} · ${item.cpf}`])} required disabled={Boolean(record)} />
          <Select label="Tipo" name="tipo" defaultValue={value(record, 'tipo') || 'estudante'} options={[["estudante", "Estudante"], ["estagio", "Estágio"]]} required />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos} required />
          <Select label="Destino" name="destino_id" defaultValue={value(record, 'destino_id')} options={references.destinos.map((item) => [String(item.id), item.nome])} required />
          <Select label="Rota interna" name="rota_interna_id" defaultValue={value(record, 'rota_interna_id')} options={references.rotas.map((item) => [String(item.id), `Rota #${item.id} · ${item.paradas.length} paradas`])} required />
          <Field label="Curso" name="curso" defaultValue={value(record, 'curso')} required />
          <Field label="Validade" name="validade" type="date" defaultValue={value(record, 'validade')} required />
          <Weekdays defaultValues={(record?.horarios_fixos as Array<{ dia_semana: number }> | undefined)?.map((item) => item.dia_semana) ?? []} />
          <UploadField label="Comprovante" bucket="documentos" folder="comprovantes" accept="application/pdf,image/*" current={comprovante} onUploaded={setComprovante} />
        </>}
      </div>

      {error && <div className="mx-5 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <footer className="flex justify-end gap-2 border-t border-[#e4e9ef] px-5 py-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando...' : record ? 'Salvar alterações' : 'Criar registro'}</button>
      </footer>
    </form>
  );
}

function buildPayload(entity: EntityKey, data: FormData, record: RegistryRecord | null, routeStops: number[], photo: string, comprovante: string): Record<string, unknown> {
  const text = (name: string) => String(data.get(name) ?? '').trim();
  const number = (name: string) => Number(data.get(name));
  switch (entity) {
    case 'destinos': return { nome: text('nome'), rua: text('rua'), municipio_id: number('municipio_id'), latitude: number('latitude'), longitude: number('longitude') };
    case 'paradas': return { nome: text('nome'), latitude: number('latitude'), longitude: number('longitude') };
    case 'rotas': return { parada_ids: routeStops };
    case 'horarios': return { municipio_destino_id: number('municipio_destino_id'), turno: text('turno'), horario_ida: text('horario_ida'), horario_volta: text('horario_volta') };
    case 'veiculos': {
      const categoria = text('categoria');
      const capacidade = categoria === 'executivo' ? 46 : categoria === 'escolar' ? 24 : 7;
      return { placa: text('placa').toUpperCase(), modelo: text('modelo'), categoria, capacidade, status: text('status'), ar_condicionado: data.has('ar_condicionado'), banheiro: data.has('banheiro'), persiana: data.has('persiana'), luz_leitura: data.has('luz_leitura'), tomada: data.has('tomada') };
    }
    case 'motoristas': return { nome: text('nome'), ...(record ? {} : { cpf: text('cpf'), senha: text('senha') }), telefone: text('telefone'), data_nasc: text('data_nasc'), turno: text('turno'), municipio_trabalho_id: number('municipio_trabalho_id'), residencia: text('residencia'), foto: photo };
    case 'clientes': return { nome: text('nome'), ...(record ? {} : { cpf: text('cpf'), senha: text('senha') }), telefone: text('telefone'), data_nasc: text('data_nasc'), foto: photo };
    case 'vinculos': return { cliente_id: record ? Number(record.cliente_id) : number('cliente_id'), tipo: text('tipo'), turno: text('turno'), destino_id: number('destino_id'), rota_interna_id: number('rota_interna_id'), curso: text('curso'), validade: text('validade'), horarios_fixos: data.getAll('horarios_fixos').map(Number), comprovante };
  }
}

function Field({ label, name, type = 'text', step, defaultValue, required, span }: { label: string; name: string; type?: string; step?: string; defaultValue?: string; required?: boolean; span?: boolean }) {
  return <label className={span ? 'sm:col-span-2' : ''}><span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span><input className="field" name={name} type={type} step={step} defaultValue={defaultValue} required={required} /></label>;
}

function Select({ label, name, options, defaultValue, required, disabled }: { label: string; name: string; options: string[][]; defaultValue?: string; required?: boolean; disabled?: boolean }) {
  return <label><span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span><select className="field" name={name} defaultValue={defaultValue} required={required} disabled={disabled}><option value="">Selecione</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>{disabled && <input type="hidden" name={name} value={defaultValue} />}</label>;
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#dfe5ed] px-3 text-xs text-slate-600"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#426fa8]" />{label}</label>;
}

function MunicipioField({ defaultMunicipioId, name = 'municipio_id' }: { defaultMunicipioId: number; name?: string }) {
  const [uf, setUF] = useState('AL');
  const [municipioId, setMunicipioId] = useState(defaultMunicipioId ? String(defaultMunicipioId) : '');
  const [items, setItems] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    municipios.listByUF(uf)
      .then((values) => { if (active) setItems(values); })
      .catch(() => { if (active) { setItems([]); setLoadError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uf]);
  const currentIsListed = items.some((item) => String(item.codigo_ibge) === municipioId);
  return <div className="grid grid-cols-[88px_1fr] gap-2 sm:col-span-2"><label><span className="field-label">UF</span><select className="field" value={uf} onChange={(event) => { setLoading(true); setLoadError(false); setItems([]); setMunicipioId(''); setUF(event.target.value); }}>{ufs.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="field-label">Município <b className="text-red-500">*</b></span><select className="field" name={name} value={municipioId} onChange={(event) => setMunicipioId(event.target.value)} required disabled={loading || loadError}><option value="">{loading ? 'Carregando...' : loadError ? 'Falha ao carregar' : 'Selecione'}</option>{municipioId && !currentIsListed && <option value={municipioId}>Município atual · IBGE {municipioId}</option>}{items.map((item) => <option key={item.codigo_ibge} value={item.codigo_ibge}>{item.nome}</option>)}</select></label></div>;
}

function RouteStops({ stops, selected, onChange }: { stops: Parada[]; selected: number[]; onChange(value: number[]): void }) {
  const [next, setNext] = useState('');
  const add = () => { const id = Number(next); if (id && !selected.includes(id)) onChange([...selected, id]); setNext(''); };
  const move = (index: number, delta: number) => { const copy = [...selected]; const target = index + delta; if (target < 0 || target >= copy.length) return; [copy[index], copy[target]] = [copy[target], copy[index]]; onChange(copy); };
  return <div className="sm:col-span-2"><span className="field-label">Sequência de paradas <b className="text-red-500">*</b></span><div className="flex gap-2"><select className="field" value={next} onChange={(event) => setNext(event.target.value)}><option value="">Adicionar parada</option>{stops.filter((item) => !selected.includes(item.id)).map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select><button type="button" className="icon-btn shrink-0" onClick={add} aria-label="Adicionar parada"><Plus size={17} /></button></div><div className="mt-3 space-y-2">{selected.map((id, index) => <div key={id} className="flex items-center gap-2 rounded-md border border-[#dfe5ed] bg-slate-50 px-3 py-2"><span className="grid h-6 w-6 place-items-center rounded bg-[#426fa8] text-[11px] font-bold text-white">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm">{stops.find((item) => item.id === id)?.nome ?? `Parada #${id}`}</span><button type="button" className="icon-btn !h-8 !w-8" onClick={() => move(index, -1)} aria-label="Subir"><ArrowUp size={14} /></button><button type="button" className="icon-btn !h-8 !w-8" onClick={() => move(index, 1)} aria-label="Descer"><ArrowDown size={14} /></button><button type="button" className="icon-btn !h-8 !w-8 text-red-500" onClick={() => onChange(selected.filter((item) => item !== id))} aria-label="Remover"><Trash2 size={14} /></button></div>)}</div>{selected.length === 0 && <p className="mt-2 text-xs text-slate-400">Adicione pelo menos uma parada.</p>}</div>;
}

function Weekdays({ defaultValues }: { defaultValues: number[] }) {
  return <div className="sm:col-span-2"><span className="field-label">Dias fixos</span><div className="grid grid-cols-5 gap-2">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((label, index) => <label key={label} className="flex min-h-10 flex-col items-center justify-center rounded-md border border-[#dfe5ed] text-xs text-slate-600"><input className="mb-1 accent-[#426fa8]" type="checkbox" name="horarios_fixos" value={index + 1} defaultChecked={defaultValues.includes(index + 1)} />{label}</label>)}</div></div>;
}

function UploadField({ label, bucket, folder, accept, current, onUploaded }: { label: string; bucket: 'fotos' | 'documentos'; folder: string; accept: string; current: string; onUploaded(value: string): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(false);
  const upload = async (file?: File) => { if (!file) return; setBusy(true); setError(''); try { onUploaded(await storage.upload(file, bucket, folder)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha no upload.'); } finally { setBusy(false); } };
  const view = async (event: MouseEvent<HTMLButtonElement>) => {
    // A label inteira abre o seletor de arquivo ao ser clicada; sem isso o clique
    // no botão "ver" também dispararia o input de upload escondido.
    event.preventDefault();
    event.stopPropagation();
    if (!current || viewing) return;
    setViewing(true);
    setError('');
    try {
      const signed = await storage.signedDownload({ bucket, path: current });
      window.open(signed.signed_url, '_blank', 'noopener,noreferrer');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o arquivo.');
    } finally {
      setViewing(false);
    }
  };
  return (
    <label className="sm:col-span-2">
      <span className="field-label">{label}</span>
      <span className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4">
        <FileUp size={19} className="text-[#426fa8]" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-xs text-slate-600">{busy ? 'Enviando...' : current || 'Selecionar arquivo'}</b>
          {error && <small className="text-red-600">{error}</small>}
        </span>
        {current && (
          <button type="button" className="icon-btn !h-8 !w-8 shrink-0" onClick={(event) => void view(event)} disabled={viewing} title="Ver arquivo">
            <Eye size={14} />
          </button>
        )}
        <input className="hidden" type="file" accept={accept} disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} />
      </span>
    </label>
  );
}

function routeStopIds(record: RegistryRecord | null) {
  const stops = record?.paradas as Array<{ id: number; ordem: number }> | undefined;
  return stops ? [...stops].sort((a, b) => a.ordem - b.ordem).map((item) => item.id) : [];
}

const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
