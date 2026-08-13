'use client';

import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, FileUp, Plus, Trash2 } from 'lucide-react';
import { clientes, municipios, storage } from '@/features/registrations/infrastructure/registrations-api';
import { formatarPlaca, limparPlaca } from '@/features/registrations/domain/placa';
import { LocationPicker } from '@/features/registrations/presentation/location-picker';
import { AsyncCombobox } from '@/shared/presentation/components/async-combobox';
import { DateInput } from '@/shared/presentation/components/date-input';
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

const onlyDigits = (raw: string) => raw.replace(/\D/g, '');

/** Formata CPF conforme os dígitos chegam: 000.000.000-00. */
function formatCPF(raw: string) {
  const digits = onlyDigits(raw).slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

/** Formata celular com DDD: (00) 00000-0000. Só celular — fixo não é aceito. */
function formatTelefone(raw: string) {
  const digits = onlyDigits(raw).slice(0, 11);
  if (!digits) return '';
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;
  const rest = digits.slice(2);
  const first = rest.slice(0, 5);
  const second = rest.slice(5);
  return second ? `(${ddd}) ${first}-${second}` : `(${ddd}) ${first}`;
}

/** Opções do combobox de cliente. Definida fora do componente para manter a
 * identidade estável entre renders — o combobox reage a mudanças dela. */
async function searchClientes(term: string) {
  const page = await clientes.page({ q: term, limit: 20 });
  return page.items.map((item) => ({ value: String(item.id), label: `${item.nome} · ${formatCPF(item.cpf)}` }));
}

export function RegistryForm({ entity, record, references, busy, error, onSubmit, onCancel }: Props) {
  const [routeStops, setRouteStops] = useState<number[]>(() => routeStopIds(record));
  const [photo, setPhoto] = useState(value(record, 'foto'));
  const [documentoIdentificacao, setDocumentoIdentificacao] = useState(value(record, 'documento_identificacao'));
  const [comprovanteResidencia, setComprovanteResidencia] = useState(value(record, 'comprovante_residencia'));
  const [comprovante, setComprovante] = useState(value(record, 'comprovante'));
  const [tipoVinculo, setTipoVinculo] = useState<'estudante' | 'estagio'>(() => value(record, 'tipo') === 'estagio' ? 'estagio' : 'estudante');
  const [localError, setLocalError] = useState('');
  // Pasta de espera usada só ao criar (o registro ainda não tem id — o
  // backend organiza o arquivo no caminho definitivo depois que ele é salvo).
  // Um id por campo, gerado uma vez e reaproveitado a cada reenvio dentro da
  // mesma sessão do formulário, para reenviar substituir em vez de acumular.
  const [novoUploadId] = useState(() => crypto.randomUUID());
  // Município escolhido em destinos, usado só para enquadrar o mapa. Fica aqui
  // porque quem seleciona (MunicipioField) e quem reage (LocationPicker) são
  // irmãos. Começa nulo mesmo ao editar: o mapa deve abrir na coordenada já
  // salva, não na cidade.
  const [municipio, setMunicipio] = useState<{ nome: string; uf: string } | null>(null);
  // Rua dos destinos: controlada, porque o mapa também escreve nela. O `doMapa`
  // anda junto do texto para a decisão de sobrescrever ser atômica — só o que o
  // mapa preencheu pode ser trocado por um novo ponto. O que o admin digitou
  // fica; endereço apagado sem aviso é pior que campo em branco.
  const [rua, setRua] = useState(() => ({ texto: value(record, 'rua'), doMapa: false }));

  const preencherRua = (logradouro: string) =>
    setRua((atual) => (atual.texto.trim() === '' || atual.doMapa ? { texto: logradouro, doMapa: true } : atual));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entity === 'clientes' && (!documentoIdentificacao || !comprovanteResidencia)) {
      setLocalError('Envie o documento de identificação e o comprovante de residência.');
      return;
    }
    setLocalError('');
    const data = new FormData(event.currentTarget);
    const payload = buildPayload(entity, data, record, routeStops, {
      photo, documentoIdentificacao, comprovanteResidencia, comprovante,
    });
    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        {entity === 'destinos' && <>
          <Field label="Nome do destino" name="nome" defaultValue={value(record, 'nome')} required span />
          <Field label="Rua / logradouro" name="rua" value={rua.texto} onChange={(texto) => setRua({ texto, doMapa: false })} required span />
          <MunicipioField defaultMunicipioId={Number(record?.municipio_id ?? 0)} onSelect={setMunicipio} />
          <LocationPicker defaultLatitude={value(record, 'latitude')} defaultLongitude={value(record, 'longitude')} municipio={municipio} onAddress={preencherRua} />
        </>}

        {entity === 'paradas' && <>
          <Field label="Nome da parada" name="nome" defaultValue={value(record, 'nome')} required span />
          {/* Parada é ponto de embarque dentro da cidade base, então não tem
              município para escolher — o mapa já abre enquadrado nela. */}
          <LocationPicker defaultLatitude={value(record, 'latitude')} defaultLongitude={value(record, 'longitude')} municipio={null} />
        </>}

        {entity === 'rotas' && <RouteStops stops={references.paradas} selected={routeStops} onChange={setRouteStops} />}

        {entity === 'horarios' && <>
          <MunicipioField defaultMunicipioId={Number(record?.municipio_destino_id ?? 0)} name="municipio_destino_id" />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos.filter(([id]) => id !== 'IN')} required />
          <Field label="Horário de ida" name="horario_ida" type="time" defaultValue={value(record, 'horario_ida').slice(0, 5)} required />
          <Field label="Horário de volta" name="horario_volta" type="time" defaultValue={value(record, 'horario_volta').slice(0, 5)} required />
        </>}

        {entity === 'veiculos' && <>
          {/* maxLength 8 conta o hífen que a máscara insere no padrão antigo.
              Sem placeholder de propósito: um exemplo só mostraria um dos dois
              formatos válidos, e a máscara já guia o admin ao digitar. */}
          <MaskedField label="Placa" name="placa" defaultValue={value(record, 'placa')} format={formatarPlaca} maxLength={8} inputMode="text" required />
          <AlphanumericField label="Modelo" name="modelo" defaultValue={value(record, 'modelo')} required />
          <Select label="Categoria" name="categoria" defaultValue={value(record, 'categoria')} options={[["executivo", "Executivo - 46 lugares"], ["escolar", "Escolar - 24 lugares"], ["carro_7_lugares", "Carro - 7 lugares"]]} required />
          <Select label="Status" name="status" defaultValue={value(record, 'status') || 'ativo'} options={[["ativo", "Ativo"], ["inativo", "Inativo"], ["manutencao", "Manutenção"]]} required />
          <div className="sm:col-span-2"><p className="field-label">Comodidades</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[['ar_condicionado', 'Ar-condicionado'], ['banheiro', 'Banheiro'], ['persiana', 'Persiana'], ['luz_leitura', 'Luz de leitura'], ['tomada', 'Tomada']].map(([key, label]) => <Checkbox key={key} name={key} label={label} defaultChecked={Boolean(record?.[key])} />)}
          </div></div>
        </>}

        {entity === 'motoristas' && <>
          <UppercaseLettersField label="Nome completo" name="nome" defaultValue={value(record, 'nome')} required span />
          {!record && <><MaskedField label="CPF" name="cpf" format={formatCPF} maxLength={14} placeholder="000.000.000-00" required /><Field label="Senha inicial" name="senha" type="password" required /></>}
          <MaskedField label="Telefone" name="telefone" defaultValue={value(record, 'telefone')} format={formatTelefone} maxLength={15} placeholder="(00) 00000-0000" />
          <DateField label="Data de nascimento" name="data_nasc" defaultValue={value(record, 'data_nasc')} autoComplete="bday" required />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos} required />
          <MunicipioField defaultMunicipioId={Number(record?.municipio_trabalho_id ?? 0)} name="municipio_trabalho_id" label="Município de trabalho" />
          <UploadField label="Foto de perfil" bucket="fotos" folder={record ? `motoristas/${record.id}` : `_novo/${novoUploadId}`} filename="foto" accept="image/*" current={photo} onUploaded={setPhoto} />
        </>}

        {entity === 'clientes' && <>
          <UppercaseLettersField label="Nome completo" name="nome" defaultValue={value(record, 'nome')} required span />
          {!record && <><MaskedField label="CPF" name="cpf" format={formatCPF} maxLength={14} placeholder="000.000.000-00" required /><Field label="Senha inicial" name="senha" type="password" required /></>}
          <MaskedField label="Telefone" name="telefone" defaultValue={value(record, 'telefone')} format={formatTelefone} maxLength={15} placeholder="(00) 00000-0000" />
          <DateField label="Data de nascimento" name="data_nasc" defaultValue={value(record, 'data_nasc')} autoComplete="bday" required />
          <UploadField
            label="Documento de identificação"
            bucket="documentos"
            folder={record ? `clientes/${record.id}` : `_novo/${novoUploadId}`}
            filename="documento-identificacao"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            current={documentoIdentificacao}
            onUploaded={(path) => { setDocumentoIdentificacao(path); setLocalError(''); }}
            hint="Envie um PDF ou uma imagem legível do documento."
            required
          />
          <UploadField
            label="Comprovante de residência"
            bucket="documentos"
            folder={record ? `clientes/${record.id}` : `_novo/${novoUploadId}`}
            filename="comprovante-residencia"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            current={comprovanteResidencia}
            onUploaded={(path) => { setComprovanteResidencia(path); setLocalError(''); }}
            hint="Use um comprovante legível emitido há no máximo 3 meses."
            required
          />
        </>}

        {entity === 'vinculos' && <>
          <AsyncCombobox
            label="Cliente"
            name="cliente_id"
            search={searchClientes}
            defaultValue={value(record, 'cliente_id')}
            defaultLabel={value(record, 'cliente_nome')}
            required
            disabled={Boolean(record)}
            placeholder="Buscar por nome, CPF ou telefone"
          />
          <Select
            label="Tipo"
            name="tipo"
            defaultValue={tipoVinculo}
            options={[["estudante", "Estudante"], ["estagio", "Estágio"]]}
            onChange={(tipo) => setTipoVinculo(tipo === 'estagio' ? 'estagio' : 'estudante')}
            required
          />
          <Select label="Turno" name="turno" defaultValue={value(record, 'turno')} options={turnos} required />
          <Select label="Destino" name="destino_id" defaultValue={value(record, 'destino_id')} options={references.destinos.map((item) => [String(item.id), item.nome])} required />
          <Select label="Rota interna" name="rota_interna_id" defaultValue={value(record, 'rota_interna_id')} options={references.rotas.map((item) => [String(item.id), `Rota #${item.id} · ${item.paradas.length} paradas`])} required />
          <UppercaseLettersField label="Curso" name="curso" defaultValue={value(record, 'curso')} required />
          <DateField label="Validade" name="validade" defaultValue={value(record, 'validade')} required />
          <Weekdays defaultValues={(record?.horarios_fixos as Array<{ dia_semana: number }> | undefined)?.map((item) => item.dia_semana) ?? []} />
          {/* Nome fixo só faz sentido editando um vínculo já existente — nesse
              caso o tipo gravado é o mesmo que está na tela. Ao criar, o
              backend é quem monta o nome definitivo com o tipo enviado no
              formulário, então "comprovante" solto na pasta de espera basta. */}
          <UploadField
            label={tipoVinculo === 'estagio'
              ? 'Termo de Compromisso de Estágio (TCE)'
              : 'Comprovante de matrícula ou vínculo acadêmico'}
            bucket="documentos"
            folder={record ? `clientes/${record.cliente_id}/vinculos/${record.id}` : `_novo/${novoUploadId}`}
            filename={record ? `comprovante-${value(record, 'tipo')}` : 'comprovante'}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            current={comprovante}
            onUploaded={setComprovante}
            hint={tipoVinculo === 'estagio'
              ? 'Envie o TCE vigente e completo, firmado pelo estudante, pela concedente e pela instituição de ensino. Aceitamos PDF, JPG, PNG ou WebP.'
              : 'Envie um comprovante de matrícula ou uma declaração de vínculo vigente, emitida pela instituição, com nome do aluno, curso e período/semestre. Aceitamos PDF, JPG, PNG ou WebP.'}
          />
        </>}
      </div>

      {(error || localError) && <div className="mx-5 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error || localError}</div>}
      <footer className="flex justify-end gap-2 border-t border-[#e4e9ef] px-5 py-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando...' : record ? 'Salvar alterações' : 'Criar registro'}</button>
      </footer>
    </form>
  );
}

interface UploadedFiles {
  photo: string;
  documentoIdentificacao: string;
  comprovanteResidencia: string;
  comprovante: string;
}

function buildPayload(entity: EntityKey, data: FormData, record: RegistryRecord | null, routeStops: number[], files: UploadedFiles): Record<string, unknown> {
  const text = (name: string) => String(data.get(name) ?? '').trim();
  const number = (name: string) => Number(data.get(name));
  const digits = (name: string) => onlyDigits(String(data.get(name) ?? ''));
  switch (entity) {
    case 'destinos': return { nome: text('nome'), rua: text('rua'), municipio_id: number('municipio_id'), latitude: number('latitude'), longitude: number('longitude') };
    case 'paradas': return { nome: text('nome'), latitude: number('latitude'), longitude: number('longitude') };
    case 'rotas': return { parada_ids: routeStops };
    case 'horarios': return { municipio_destino_id: number('municipio_destino_id'), turno: text('turno'), horario_ida: text('horario_ida'), horario_volta: text('horario_volta') };
    case 'veiculos': {
      const categoria = text('categoria');
      const capacidade = categoria === 'executivo' ? 46 : categoria === 'escolar' ? 24 : 7;
      // A placa vai limpa: o hífen é só da máscara, e guardar as duas formas
      // furaria o UNIQUE da coluna com o mesmo carro duas vezes.
      return { placa: limparPlaca(text('placa')), modelo: text('modelo'), categoria, capacidade, status: text('status'), ar_condicionado: data.has('ar_condicionado'), banheiro: data.has('banheiro'), persiana: data.has('persiana'), luz_leitura: data.has('luz_leitura'), tomada: data.has('tomada') };
    }
    case 'motoristas': return { nome: text('nome'), ...(record ? {} : { cpf: digits('cpf'), senha: text('senha') }), telefone: digits('telefone'), data_nasc: text('data_nasc'), turno: text('turno'), municipio_trabalho_id: number('municipio_trabalho_id'), foto: files.photo };
    case 'clientes': return { nome: text('nome'), ...(record ? {} : { cpf: digits('cpf'), senha: text('senha') }), telefone: digits('telefone'), data_nasc: text('data_nasc'), documento_identificacao: files.documentoIdentificacao, comprovante_residencia: files.comprovanteResidencia };
    case 'vinculos': return { cliente_id: record ? Number(record.cliente_id) : number('cliente_id'), tipo: text('tipo'), turno: text('turno'), destino_id: number('destino_id'), rota_interna_id: number('rota_interna_id'), curso: text('curso'), validade: text('validade'), horarios_fixos: data.getAll('horarios_fixos').map(Number), comprovante: files.comprovante };
  }
}

/** Passe `value` + `onChange` quando algo fora do campo precisar escrever nele
 * (é o caso da rua, preenchida pelo mapa); sem eles o campo fica não-controlado
 * e o valor sai pelo FormData, como no resto do formulário. */
function Field({ label, name, type = 'text', step, defaultValue, value, onChange, required, span }: { label: string; name: string; type?: string; step?: string; defaultValue?: string; value?: string; onChange?(next: string): void; required?: boolean; span?: boolean }) {
  const controlled = value !== undefined;
  return <label className={span ? 'sm:col-span-2' : ''}><span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span><input className="field" name={name} type={type} step={step} {...(controlled ? { value, onChange: (event) => onChange?.(event.target.value) } : { defaultValue })} required={required} /></label>;
}

function DateField({ label, name, defaultValue, required, autoComplete }: { label: string; name: string; defaultValue?: string; required?: boolean; autoComplete?: string }) {
  return <label><span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span><DateInput name={name} defaultValue={defaultValue} required={required} autoComplete={autoComplete} /></label>;
}

/** Modelo do veículo: aceita letras, números e os espaços necessários para
 * nomes compostos, removendo símbolos tanto na digitação quanto na colagem. */
function AlphanumericField({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
      <input
        className="field"
        name={name}
        type="text"
        defaultValue={defaultValue}
        required={required}
        onChange={(event) => {
          const clean = event.target.value.replace(/[^\p{L}\p{N} ]/gu, '');
          if (clean !== event.target.value) event.target.value = clean;
        }}
      />
    </label>
  );
}

/** Texto alfabético para nomes de pessoas e cursos: bloqueia dígitos e símbolos
 * ao digitar e força maiúscula. Nomes de lugar usam o Field normal, pois números
 * podem fazer parte de endereços legítimos. */
function UppercaseLettersField({ label, name, defaultValue, required, span }: { label: string; name: string; defaultValue?: string; required?: boolean; span?: boolean }) {
  return (
    <label className={span ? 'sm:col-span-2' : ''}>
      <span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
      <input
        className="field"
        name={name}
        type="text"
        defaultValue={defaultValue}
        required={required}
        onChange={(event) => {
          const clean = event.target.value.replace(/[^\p{L} '-]/gu, '').toUpperCase();
          if (clean !== event.target.value) event.target.value = clean;
        }}
      />
    </label>
  );
}

/** CPF e telefone: mostra a máscara pro admin, mas quem envia pro backend
 * (buildPayload) limpa a pontuação — lá o campo é guardado só com dígitos. */
function MaskedField({ label, name, defaultValue, required, format, placeholder, maxLength, inputMode = 'numeric' }: { label: string; name: string; defaultValue?: string; required?: boolean; format(raw: string): string; placeholder?: string; maxLength: number; inputMode?: 'numeric' | 'text' }) {
  const [text, setText] = useState(() => format(defaultValue ?? ''));
  return (
    <label>
      <span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
      <input
        className="field"
        name={name}
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        value={text}
        onChange={(event) => setText(format(event.target.value))}
        required={required}
      />
    </label>
  );
}

function Select({ label, name, options, defaultValue, required, disabled, onChange }: { label: string; name: string; options: string[][]; defaultValue?: string; required?: boolean; disabled?: boolean; onChange?(value: string): void }) {
  return <label><span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span><select className="field" name={name} defaultValue={defaultValue} required={required} disabled={disabled} onChange={(event) => onChange?.(event.target.value)}><option value="">Selecione</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>{disabled && <input type="hidden" name={name} value={defaultValue} />}</label>;
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#dfe5ed] px-3 text-xs text-slate-600"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#426fa8]" />{label}</label>;
}

/** `onSelect` avisa quem precisa reagir à escolha (hoje só o mapa dos destinos).
 * Dispara no evento do select, nunca na montagem — então abrir um registro para
 * edição não reenquadra o mapa por cima da coordenada já salva. */
function MunicipioField({ defaultMunicipioId, name = 'municipio_id', label = 'Município', onSelect }: { defaultMunicipioId: number; name?: string; label?: string; onSelect?(municipio: { nome: string; uf: string } | null): void }) {
  const [uf, setUF] = useState('AL');
  const [municipioId, setMunicipioId] = useState(defaultMunicipioId ? String(defaultMunicipioId) : '');
  const [items, setItems] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Ao editar um registro cujo município não é de AL, descobre a UF real antes de
  // carregar a lista — sem isso o campo assumia AL sempre e mostrava só o código
  // cru ("Município atual · IBGE 2611606") pra qualquer cidade de outro estado.
  useEffect(() => {
    if (!defaultMunicipioId) return;
    let active = true;
    municipios.get(defaultMunicipioId).then((found) => { if (active) setUF(found.uf); }).catch(() => {});
    return () => { active = false; };
  }, [defaultMunicipioId]);

  useEffect(() => {
    let active = true;
    // setTimeout adia o setState pra fora do corpo síncrono do efeito, mesma
    // convenção de useResource — evita a cascata de renders que o React acusa ao
    // chamar setState direto na primeira execução do efeito.
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setLoadError(false);
      municipios.listByUF(uf)
        .then((values) => { if (active) setItems(values); })
        .catch(() => { if (active) { setItems([]); setLoadError(true); } })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [uf]);
  const currentIsListed = items.some((item) => String(item.codigo_ibge) === municipioId);
  return <div className="grid grid-cols-[88px_1fr] gap-2 sm:col-span-2"><label><span className="field-label">UF</span><select className="field" value={uf} onChange={(event) => { setItems([]); setMunicipioId(''); onSelect?.(null); setUF(event.target.value); }}>{ufs.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="field-label">{label} <b className="text-red-500">*</b></span><select className="field" name={name} value={municipioId} onChange={(event) => { setMunicipioId(event.target.value); const found = items.find((item) => String(item.codigo_ibge) === event.target.value); onSelect?.(found ? { nome: found.nome, uf } : null); }} required disabled={loading || loadError}><option value="">{loading ? 'Carregando...' : loadError ? 'Falha ao carregar' : 'Selecione'}</option>{municipioId && !currentIsListed && <option value={municipioId}>Município atual · IBGE {municipioId}</option>}{items.map((item) => <option key={item.codigo_ibge} value={item.codigo_ibge}>{item.nome}</option>)}</select></label></div>;
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

function UploadField({ label, bucket, folder, filename, accept, current, onUploaded, hint, required }: { label: string; bucket: 'fotos' | 'documentos'; folder: string; filename: string; accept: string; current: string; onUploaded(value: string): void; hint?: string; required?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(false);
  const upload = async (file?: File) => { if (!file) return; setBusy(true); setError(''); try { onUploaded(await storage.upload(file, bucket, folder, filename)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha no upload.'); } finally { setBusy(false); } };
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
    <div className="sm:col-span-2">
      <span className="field-label">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
      <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4">
        <FileUp size={19} className="text-[#426fa8]" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-xs text-slate-600">{busy ? 'Enviando...' : current || 'Selecionar arquivo'}</b>
          {error ? <small className="text-red-600">{error}</small> : hint && <small className="text-slate-500">{hint}</small>}
        </span>
        {current && (
          <button type="button" className="icon-btn !h-8 !w-8 shrink-0" onClick={(event) => void view(event)} disabled={viewing} title="Ver arquivo">
            <Eye size={14} />
          </button>
        )}
        <input className="hidden" type="file" accept={accept} disabled={busy} aria-label={label} aria-required={required} onChange={(event) => void upload(event.target.files?.[0])} />
      </label>
    </div>
  );
}

function routeStopIds(record: RegistryRecord | null) {
  const stops = record?.paradas as Array<{ id: number; ordem: number }> | undefined;
  return stops ? [...stops].sort((a, b) => a.ordem - b.ordem).map((item) => item.id) : [];
}

const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
