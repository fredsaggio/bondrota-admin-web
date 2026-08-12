'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BusFront, Clock3, Gauge, LocateFixed, MapPin, Navigation, Radio, UserRound } from 'lucide-react';
import { EmptyState, ErrorState, LoadingRows, PageHeader } from '@/shared/presentation/components/ui';
import { useResource } from '@/shared/application/use-resource';
import { loadLiveTrip, loadMonitoringOverview } from '@/features/monitoring/application/load-monitoring';

const LiveMap = dynamic(() => import('@/features/monitoring/presentation/live-map'), { ssr: false, loading: () => <div className="app-loader !min-h-full"><span className="spinner" /><span>Carregando mapa</span></div> });

export function MonitoringPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const mainLoader = useCallback(() => loadMonitoringOverview(), []);
  const main = useResource(mainLoader);

  // A API já devolve só programadas/em andamento, em ordem crescente. Aqui resta
  // subir as que estão em rota, que são as que o operador quer ver primeiro.
  const visibleTrips = useMemo(() => [...(main.data?.tripItems ?? [])].sort((a, b) => Number(b.viagem.status === 'em_andamento') - Number(a.viagem.status === 'em_andamento')), [main.data]);
  const selectedId = selected ?? visibleTrips[0]?.viagem.id ?? null;
  const liveLoader = useCallback(() => loadLiveTrip(selectedId), [selectedId]);
  const live = useResource(liveLoader);
  const reloadLive = live.reload;

  useEffect(() => {
    if (!selectedId) return;
    const interval = window.setInterval(() => void reloadLive(), 10_000);
    return () => window.clearInterval(interval);
  }, [reloadLive, selectedId]);

  const current = visibleTrips.find((item) => item.viagem.id === selectedId);
  const driver = main.data?.driverItems.find((item) => item.id === current?.ciclo.motorista_id);
  const vehicle = main.data?.vehicleItems.find((item) => item.id === current?.ciclo.veiculo_id);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-7">
      <PageHeader title="Monitoramento" subtitle="Última localização registrada pela API para cada viagem" />
      {main.error && <ErrorState message={main.error} retry={main.reload} />}
      {main.loading ? <LoadingRows /> : visibleTrips.length === 0 ? <div className="panel"><EmptyState title="Nenhuma viagem disponível" description="Viagens programadas e em andamento aparecerão aqui." /></div> : (
        <div className="grid min-h-[680px] grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="panel flex max-h-[680px] flex-col overflow-hidden">
            <div className="border-b border-[#e4e9ef] p-4"><h2 className="text-sm font-bold">Viagens ativas</h2><p className="mt-1 text-xs text-slate-500">{visibleTrips.length} disponíveis</p></div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">{visibleTrips.map(({ viagem, ciclo }) => {
              const active = viagem.id === selectedId;
              return <button key={viagem.id} onClick={() => setSelected(viagem.id)} className={`w-full rounded-md border p-3 text-left transition-colors ${active ? 'border-[#426fa8] bg-[#edf3fa]' : 'border-[#e4e9ef] bg-white hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">Viagem #{viagem.id}</p><span className={`badge ${viagem.status === 'em_andamento' ? 'badge-green' : 'badge-blue'}`}>{viagem.status === 'em_andamento' ? 'Em rota' : 'Programada'}</span></div><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} />{date(ciclo.data_viagem)} · {ciclo.turno} · <span className="capitalize">{viagem.sentido}</span></p></button>;
            })}</div>
          </aside>

          <section className="panel grid min-h-[680px] grid-rows-[minmax(390px,1fr)_auto] overflow-hidden">
            <div className="relative min-h-96 bg-[#e7ece8]">
              <LiveMap location={live.data?.location ?? null} route={live.data?.route ?? null} />
              <div className="absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-md border border-white/70 bg-white/95 px-3 py-2 text-xs font-semibold shadow-sm"><Radio size={14} className={live.data?.location ? 'text-emerald-600' : 'text-slate-400'} />{live.data?.location ? 'Sinal recebido' : 'Sem localização'}</div>
            </div>
            <div className="border-t border-[#e4e9ef] p-4 sm:p-5">
              {live.error && <ErrorState message={live.error} retry={live.reload} />}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Info icon={UserRound} label="Motorista" value={driver?.nome ?? `#${current?.ciclo.motorista_id}`} />
                <Info icon={BusFront} label="Veículo" value={vehicle ? `${vehicle.placa} · ${vehicle.modelo}` : `#${current?.ciclo.veiculo_id}`} />
                <Info icon={Gauge} label="Velocidade" value={live.data?.location ? `${live.data.location.velocidade_kmh.toFixed(0)} km/h` : '—'} />
                <Info icon={Navigation} label="Direção" value={live.data?.location ? `${live.data.location.direcao_graus.toFixed(0)}°` : '—'} />
              </div>
              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-1.5"><MapPin size={13} />{live.data?.location ? `${live.data.location.latitude.toFixed(5)}, ${live.data.location.longitude.toFixed(5)}` : 'Coordenadas indisponíveis'}</span>
                <span className="flex items-center gap-1.5"><LocateFixed size={13} />{live.data?.location ? `Atualizado em ${dateTime(live.data.location.registrada_em)}` : 'Aguardando transmissão do motorista'}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof BusFront; label: string; value: string }) { return <div className="rounded-md border border-[#e4e9ef] p-3"><span className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400"><Icon size={13} />{label}</span><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p></div>; }
function date(value: string) { return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`)); }
function dateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
