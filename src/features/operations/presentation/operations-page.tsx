'use client';

import { useCallback, useMemo, useState } from 'react';
import { Ban, Check, Eye, MapPinned, Play, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal, Notice, PageHeader, SearchField } from '@/shared/presentation/components/ui';
import { ApiError } from '@/shared/infrastructure/http/api-client';
import { useResource } from '@/shared/application/use-resource';
import { useCursorList } from '@/shared/application/use-cursor-list';
import { useDebouncedValue } from '@/shared/application/use-debounced-value';
import { loadOperations, type OperationsData } from '@/features/operations/application/load-operations';
import { reservas, viagens } from '@/features/operations/infrastructure/operations-api';
import type { FalhaPlanejamento, ReservaComNomes, RotaDinamica, StatusPresenca, ViagemComCiclo, ViagemHorario, ViagemReserva } from '@/features/operations/domain/models';

type Tab = 'reservas' | 'viagens' | 'falhas';

export function OperationsPage() {
  const [tab, setTab] = useState<Tab>('reservas');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'delete-booking' | 'cancel-trip'; id: number } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // A busca de reservas vai ao servidor, então espera o usuário parar de digitar.
  // Viagens e falhas ainda filtram em memória, onde o termo cru responde na hora.
  const debouncedSearch = useDebouncedValue(search);
  const loadBookings = useCallback(
    (cursor?: string) => reservas.list({ cursor, q: debouncedSearch, dataInicio: range.inicio, dataFim: range.fim }),
    [debouncedSearch, range.inicio, range.fim],
  );
  const bookings = useCursorList<ReservaComNomes>(loadBookings);

  const loader = useCallback(() => loadOperations(), []);
  const resource = useResource<OperationsData>(loader);

  const filtered = useMemo(() => {
    const data = resource.data;
    if (!data) return [];
    const query = search.trim().toLowerCase();

    // Busca só nos campos realmente exibidos em cada tabela. JSON.stringify do
    // item inteiro batia com ids internos e nomes de campo, não só com o que a
    // tela mostra.
    if (tab === 'viagens') {
      if (!query) return data.trips;
      return data.trips.filter(({ viagem, ciclo }) => [
        String(viagem.id), ciclo.data_viagem, ciclo.turno, String(ciclo.municipio_destino_id), viagem.sentido,
        String(ciclo.veiculo_id), viagem.status,
      ].join(' ').toLowerCase().includes(query));
    }
    if (!query) return data.failures;
    return data.failures.filter((item) => [
      String(item.id), item.data_viagem, String(item.municipio_destino_id), item.turno, item.sentido,
      String(item.tentativas), item.ultimo_erro ?? '', item.proxima_tentativa_em ?? '',
    ].join(' ').toLowerCase().includes(query));
  }, [resource.data, search, tab]);

  const reloadCurrentTab = useCallback(
    () => (tab === 'reservas' ? bookings.reload() : resource.reload()),
    [bookings, resource, tab],
  );

  async function action(run: () => Promise<unknown>, success: string) {
    setBusy(true); setNotice(null);
    try { await run(); setNotice({ type: 'success', text: success }); await reloadCurrentTab(); }
    catch (reason) { setNotice({ type: 'error', text: reason instanceof Error ? reason.message : 'A operação não pôde ser concluída.' }); }
    finally { setBusy(false); setConfirm(null); }
  }

  const labels = { reservas: 'Reservas', viagens: 'Viagens', falhas: 'Falhas do planejamento' };
  const listLoading = tab === 'reservas' ? bookings.loading : resource.loading;
  const listError = tab === 'reservas' ? bookings.error : resource.error;
  const isEmpty = tab === 'reservas' ? bookings.items.length === 0 : filtered.length === 0;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-7">
      <PageHeader title="Operação" subtitle="Acompanhe reservas, viagens geradas e tentativas do planejamento" />
      <div className="panel flex overflow-x-auto p-1.5">{(Object.keys(labels) as Tab[]).map((key) => <button key={key} onClick={() => { setTab(key); setSearch(''); setRange({ inicio: '', fim: '' }); }} className={`min-h-9 shrink-0 rounded-md px-4 text-xs font-semibold ${tab === key ? 'bg-[#426fa8] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{labels[key]}</button>)}</div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e4e9ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold">{labels[tab]}</h2>
            <p className="mt-1 text-xs text-slate-500">{tab === 'reservas' ? `${bookings.items.length} carregada(s)${bookings.hasMore ? ' · há mais' : ''}` : 'Atualização sob demanda a partir da API'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {tab === 'reservas' && <DateRange value={range} onChange={setRange} />}
            <SearchField value={search} onChange={setSearch} />
            <button className="icon-btn shrink-0" onClick={() => void reloadCurrentTab()} title="Atualizar"><RefreshCw size={16} /></button>
          </div>
        </div>
        {listLoading ? <LoadingRows /> : listError ? <ErrorState message={listError} retry={reloadCurrentTab} /> : isEmpty ? <EmptyState /> : (
          tab === 'reservas' ? <BookingsTable items={bookings.items} busy={busy} onCancel={(id) => void action(() => reservas.cancel(id), 'Reserva cancelada.')} onDelete={(id) => setConfirm({ kind: 'delete-booking', id })} /> :
          tab === 'viagens' ? <TripsTable items={filtered as ViagemComCiclo[]} busy={busy} onDetail={setDetailId} onStart={(id) => void action(() => viagens.start(id), 'Viagem iniciada.')} onFinish={(id) => void action(() => viagens.finish(id), 'Viagem concluída.')} onCancel={(id) => setConfirm({ kind: 'cancel-trip', id })} /> :
          <FailuresTable items={filtered as FalhaPlanejamento[]} />
        )}
        {tab === 'reservas' && bookings.hasMore && !listLoading && (
          <div className="border-t border-[#e4e9ef] p-4 text-center">
            <button className="btn btn-secondary" disabled={bookings.loadingMore} onClick={() => void bookings.loadMore()}>
              {bookings.loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>

      {confirm && <ConfirmDialog title={confirm.kind === 'delete-booking' ? 'Excluir reserva' : 'Cancelar viagem'} message={confirm.kind === 'delete-booking' ? 'A reserva será removida permanentemente.' : 'A viagem será cancelada e não poderá ser iniciada.'} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => void action(() => confirm.kind === 'delete-booking' ? reservas.remove(confirm.id) : viagens.cancel(confirm.id), confirm.kind === 'delete-booking' ? 'Reserva excluída.' : 'Viagem cancelada.')} />}
      {detailId && <TripDetails viagemId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function DateRange({ value, onChange }: { value: { inicio: string; fim: string }; onChange(value: { inicio: string; fim: string }): void }) {
  return (
    <div className="flex items-end gap-2">
      <label className="text-[10px] uppercase text-slate-400">De<input type="date" className="field !min-h-9 !py-1 text-xs" value={value.inicio} onChange={(event) => onChange({ ...value, inicio: event.target.value })} /></label>
      <label className="text-[10px] uppercase text-slate-400">Até<input type="date" className="field !min-h-9 !py-1 text-xs" value={value.fim} onChange={(event) => onChange({ ...value, fim: event.target.value })} /></label>
      {(value.inicio || value.fim) && <button className="btn btn-secondary !min-h-9 !py-1 text-xs" onClick={() => onChange({ inicio: '', fim: '' })}>Limpar</button>}
    </div>
  );
}

function BookingsTable({ items, busy, onCancel, onDelete }: { items: ReservaComNomes[]; busy: boolean; onCancel(id: number): void; onDelete(id: number): void }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Cliente</th><th>Data</th><th>Turno</th><th>Sentido</th><th>Destino</th><th>Status</th><th>Ações</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="font-semibold">{item.id}</td><td>{item.cliente_nome}</td><td>{date(item.data_viagem)}</td><td><span className="badge badge-blue">{item.turno}</span></td><td className="capitalize">{item.sentido}</td><td>{item.destino_nome}</td><td><Badge status={item.status} /></td><td><div className="flex gap-1"><button className="icon-btn !h-8 !w-8 text-amber-600" disabled={busy || item.status === 'cancelada'} onClick={() => onCancel(item.id)} title="Cancelar"><Ban size={14} /></button><button className="icon-btn !h-8 !w-8 text-red-500" disabled={busy} onClick={() => onDelete(item.id)} title="Excluir"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>;
}

function TripsTable({ items, busy, onDetail, onStart, onFinish, onCancel }: { items: ViagemComCiclo[]; busy: boolean; onDetail(id: number): void; onStart(id: number): void; onFinish(id: number): void; onCancel(id: number): void }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Data</th><th>Turno</th><th>Destino</th><th>Sentido</th><th>Veículo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{items.map(({ viagem, ciclo }) => <tr key={viagem.id}><td className="font-semibold">{viagem.id}</td><td>{date(ciclo.data_viagem)}</td><td><span className="badge badge-blue">{ciclo.turno}</span></td><td>Município #{ciclo.municipio_destino_id}</td><td className="capitalize">{viagem.sentido}</td><td>#{ciclo.veiculo_id}</td><td><Badge status={viagem.status} /></td><td><div className="flex gap-1"><button className="icon-btn !h-8 !w-8" onClick={() => onDetail(viagem.id)} title="Detalhes"><Eye size={14} /></button>{viagem.status === 'programada' && <button className="icon-btn !h-8 !w-8 text-emerald-600" disabled={busy} onClick={() => onStart(viagem.id)} title="Iniciar"><Play size={14} /></button>}{viagem.status === 'em_andamento' && <button className="icon-btn !h-8 !w-8 text-emerald-600" disabled={busy} onClick={() => onFinish(viagem.id)} title="Concluir"><Check size={14} /></button>}{!['concluida', 'cancelada'].includes(viagem.status) && <button className="icon-btn !h-8 !w-8 text-red-500" disabled={busy} onClick={() => onCancel(viagem.id)} title="Cancelar"><Ban size={14} /></button>}</div></td></tr>)}</tbody></table></div>;
}

function FailuresTable({ items }: { items: FalhaPlanejamento[] }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Viagem</th><th>Turno</th><th>Sentido</th><th>Tentativas</th><th>Erro</th><th>Próxima tentativa</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{date(item.data_viagem)} · Município #{item.municipio_destino_id}</td><td><span className="badge badge-blue">{item.turno}</span></td><td className="capitalize">{item.sentido}</td><td><span className="badge badge-red">{item.tentativas}</span></td><td><span className="block max-w-sm whitespace-normal text-red-700">{item.ultimo_erro ?? 'Erro não informado'}</span></td><td>{item.proxima_tentativa_em ? dateTime(item.proxima_tentativa_em) : 'Sem nova tentativa'}</td></tr>)}</tbody></table></div>;
}

function TripDetails({ viagemId, onClose }: { viagemId: number; onClose(): void }) {
  const [routeBusy, setRouteBusy] = useState(false);
  const [message, setMessage] = useState('');
  const loader = useCallback(async () => {
    const [trip, schedules, passengers, route] = await Promise.all([
      viagens.get(viagemId), viagens.schedules(viagemId), viagens.passengers(viagemId), viagens.route(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
    ]);
    return { trip, schedules, passengers, route };
  }, [viagemId]);
  const resource = useResource(loader);

  async function routeAction(kind: 'calculate' | 'delete') {
    setRouteBusy(true); setMessage('');
    try { if (kind === 'calculate') await viagens.calculateRoute(viagemId); else await viagens.deleteRoute(viagemId); setMessage(kind === 'calculate' ? 'Rota calculada.' : 'Rota removida.'); await resource.reload(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha na rota.'); }
    finally { setRouteBusy(false); }
  }

  async function presence(reservaId: number, status: StatusPresenca) {
    try { await viagens.setPresence(viagemId, reservaId, status); await resource.reload(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao registrar presença.'); }
  }

  return <Modal title={`Viagem #${viagemId}`} description="Horários, passageiros e rota calculada" onClose={onClose} wide><div className="p-5">{resource.loading ? <LoadingRows /> : !resource.data ? <ErrorState message={resource.error || 'Não foi possível carregar os dados da viagem.'} retry={resource.reload} /> : <div className="space-y-5">
    {message && <Notice type={message.includes('Falha') || message.includes('Não') ? 'error' : 'success'}>{message}</Notice>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Info label="Data" value={date(resource.data.trip.ciclo.data_viagem)} /><Info label="Turno" value={resource.data.trip.ciclo.turno} /><Info label="Sentido" value={resource.data.trip.viagem.sentido} /><Info label="Status" value={resource.data.trip.viagem.status} /></div>
    <section><h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Horários</h3><div className="flex flex-wrap gap-2">{resource.data.schedules.map((item: ViagemHorario) => <span className="badge badge-blue" key={item.id}>{item.tipo.replaceAll('_', ' ')} · {dateTime(item.horario)}</span>)}</div></section>
    <section><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold uppercase text-slate-500">Passageiros ({resource.data.passengers.length})</h3></div>{resource.data.passengers.length === 0 ? <p className="text-sm text-slate-400">Nenhum passageiro alocado.</p> : <div className="space-y-2">{resource.data.passengers.map((item: ViagemReserva) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e4e9ef] p-3"><span className="text-sm"><b>Reserva #{item.reserva_id}</b> · Cliente #{item.cliente_id}</span><select className="field !min-h-8 !w-auto !py-1 text-xs" value={item.status_presenca} onChange={(event) => void presence(item.reserva_id, event.target.value as StatusPresenca)}><option value="aguardando">Aguardando</option><option value="embarcou">Embarcou</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option></select></div>)}</div>}</section>
    <RouteSummary route={resource.data.route} busy={routeBusy} onCalculate={() => void routeAction('calculate')} onDelete={() => void routeAction('delete')} />
  </div>}</div></Modal>;
}

function RouteSummary({ route, busy, onCalculate, onDelete }: { route: RotaDinamica | null; busy: boolean; onCalculate(): void; onDelete(): void }) {
  return <section className="rounded-md border border-[#dfe5ed] bg-slate-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 text-sm font-bold"><MapPinned size={16} />Rota dinâmica</h3><p className="mt-1 text-xs text-slate-500">{route ? `${(route.rota.distancia_metros / 1000).toFixed(1)} km · ${Math.round(route.rota.duracao_segundos / 60)} min · ${route.destinos.length} destinos` : 'Ainda não calculada para esta viagem.'}</p></div><div className="flex gap-2">{route && <button className="btn btn-danger" disabled={busy} onClick={onDelete}><Trash2 size={14} />Remover</button>}<button className="btn btn-primary" disabled={busy} onClick={onCalculate}><MapPinned size={14} />{route ? 'Recalcular' : 'Calcular rota'}</button></div></div></section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-[#e4e9ef] p-3"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p></div>; }
function Badge({ status }: { status: string }) { const tone = ['confirmada', 'concluida', 'em_andamento'].includes(status) ? 'green' : status === 'programada' ? 'blue' : 'red'; return <span className={`badge badge-${tone}`}>{status.replaceAll('_', ' ')}</span>; }
function date(value: string) { return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
function dateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
