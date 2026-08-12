'use client';

import { useMemo } from 'react';
import { AlertTriangle, BusFront, CalendarClock, CheckCircle2, Route, UsersRound, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader, ErrorState, LoadingRows, EmptyState } from '@/shared/presentation/components/ui';
import { useResource } from '@/shared/application/use-resource';
import { loadDashboard } from '@/features/dashboard/application/load-dashboard';

const statusLabels: Record<string, string> = {
  programada: 'Programadas', em_andamento: 'Em andamento', concluida: 'Concluídas', cancelada: 'Canceladas',
};
const chartColors: Record<string, string> = {
  programada: '#426fa8', em_andamento: '#16856b', concluida: '#7c8ca3', cancelada: '#c94b52',
};

function localDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${value}T12:00:00`));
}

/** Data de hoje no fuso operacional (`AppConfig.fuso_horario`), no formato YYYY-MM-DD. */
function todayInTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export function DashboardPage() {
  const resource = useResource(loadDashboard);

  const metrics = useMemo(() => {
    const data = resource.data;
    if (!data) return null;
    const today = todayInTimeZone(data.timeZone);
    const activeBookings = data.bookingSummary.confirmadas_total;
    const activeFleet = data.vehicleItems.filter((item) => item.status === 'ativo').length;
    const statusData = Object.keys(statusLabels).map((status) => ({
      name: statusLabels[status],
      status,
      value: data.tripSummary.por_status[status as keyof typeof data.tripSummary.por_status] ?? 0,
    }));
    const shifts = (['MT', 'VT', 'NT'] as const).map((turno) => ({
      turno,
      viagens: data.tripSummary.por_turno[turno] ?? 0,
      reservas: data.bookingSummary.confirmadas_por_turno[turno] ?? 0,
    }));
    // "Próximas" já vem do servidor em ordem crescente e limitada — ordenar e
    // cortar aqui exigiria ter a tabela inteira em memória.
    return { today, activeBookings, activeFleet, statusData, shifts, upcoming: data.tripSummary.proximas };
  }, [resource.data]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-7">
      <PageHeader title="Visão geral" subtitle="Indicadores consolidados da operação e do planejamento automático" />
      {resource.error && <ErrorState message={resource.error} retry={resource.reload} />}
      {resource.loading || !resource.data || !metrics ? <LoadingRows /> : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={CalendarClock} label="Viagens hoje" value={String(resource.data.tripSummary.hoje_total)} detail={`${resource.data.tripSummary.hoje_em_andamento} em andamento`} tone="blue" />
            <Metric icon={UsersRound} label="Reservas confirmadas" value={String(metrics.activeBookings)} detail={`${resource.data.clientSummary.total} clientes cadastrados`} tone="green" />
            <Metric icon={BusFront} label="Frota disponível" value={`${metrics.activeFleet}/${resource.data.vehicleItems.length}`} detail={`${resource.data.vehicleItems.filter((item) => item.status === 'manutencao').length} em manutenção`} tone="amber" />
            <Metric icon={AlertTriangle} label="Falhas pendentes" value={String(resource.data.failures.length)} detail={resource.data.failures.length ? 'Aguardando nova tentativa' : 'Processamento saudável'} tone={resource.data.failures.length ? 'red' : 'green'} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <div className="panel p-5">
              <SectionTitle title="Demanda por turno" subtitle="Reservas confirmadas e viagens planejadas" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 256 }}>
                  <BarChart data={metrics.shifts} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="#e8edf2" vertical={false} />
                    <XAxis dataKey="turno" axisLine={false} tickLine={false} tick={{ fill: '#778499', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#778499', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f4f7fa' }} contentStyle={{ border: '1px solid #dfe5ed', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="reservas" name="Reservas" fill="#426fa8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="viagens" name="Viagens" fill="#16856b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <SectionTitle title="Situação das viagens" subtitle="Distribuição de todo o histórico disponível" />
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
                  <PieChart>
                    <Pie data={metrics.statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                      {metrics.statusData.map((item) => <Cell key={item.status} fill={chartColors[item.status]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ border: '1px solid #dfe5ed', borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {metrics.statusData.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: chartColors[item.status] }} />{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_.55fr]">
            <div className="panel overflow-hidden">
              <div className="border-b border-[#e4e9ef] px-5 py-4"><SectionTitle title="Próximas viagens" subtitle="Programadas ou atualmente em andamento" /></div>
              {metrics.upcoming.length === 0 ? <EmptyState title="Nenhuma viagem próxima" /> : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Viagem</th><th>Data</th><th>Turno</th><th>Sentido</th><th>Veículo</th><th>Status</th></tr></thead>
                    <tbody>{metrics.upcoming.map(({ viagem, ciclo, veiculo_placa }) => (
                      <tr key={viagem.id}>
                        <td className="font-semibold">#{viagem.id}</td><td>{localDate(ciclo.data_viagem)}</td><td><span className="badge badge-blue">{ciclo.turno}</span></td><td className="capitalize">{viagem.sentido}</td><td>{veiculo_placa}</td><td><Status status={viagem.status} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel p-5">
              <SectionTitle title="Capacidade operacional" subtitle="Recursos aptos para alocação" />
              <div className="space-y-3">
                <HealthLine icon={BusFront} label="Veículos ativos" value={metrics.activeFleet} total={resource.data.vehicleItems.length} />
                <HealthLine icon={UsersRound} label="Motoristas" value={resource.data.driverItems.length} total={resource.data.driverItems.length} />
                <HealthLine icon={Wrench} label="Em manutenção" value={resource.data.vehicleItems.filter((item) => item.status === 'manutencao').length} total={resource.data.vehicleItems.length} warning />
              </div>
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={15} /> Planejamento automático ativo</p>
                <p className="mt-1 leading-5 text-emerald-700">As viagens são formadas a partir das reservas 30 minutos antes da partida.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Route; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'amber' | 'red' }) {
  const colors = { blue: ['#e8f0fa', '#426fa8'], green: ['#e3f4ee', '#16856b'], amber: ['#fdf0d9', '#d68a18'], red: ['#fbe7e8', '#c94b52'] }[tone];
  return <article className="panel flex items-center gap-4 p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md" style={{ background: colors[0], color: colors[1] }}><Icon size={21} /></div><div className="min-w-0"><p className="text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 truncate text-[11px] text-slate-400">{detail}</p></div></article>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>;
}

function Status({ status }: { status: string }) {
  const tone = status === 'em_andamento' ? 'green' : status === 'cancelada' ? 'red' : status === 'programada' ? 'blue' : 'amber';
  return <span className={`badge badge-${tone}`}>{statusLabels[status] ?? status}</span>;
}

function HealthLine({ icon: Icon, label, value, total, warning }: { icon: typeof BusFront; label: string; value: number; total: number; warning?: boolean }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return <div><div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-600"><Icon size={14} />{label}</span><strong>{value}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${percentage}%`, background: warning ? '#d68a18' : '#426fa8' }} /></div></div>;
}
