import { api } from '@/shared/infrastructure/http/api-client';
import type { JsonRecord } from '@/shared/infrastructure/http/rest-collection';
import type { CursorPage } from '@/shared/domain/pagination';
import type { FalhaPlanejamento, Reserva, ReservaComNomes, ReservaResumo, RotaDinamica, StatusPresenca, StatusViagem, Viagem, ViagemComCiclo, ViagemComNomes, ViagemHorario, ViagemLocalizacao, ViagemReserva, ViagemResumo } from '@/features/operations/domain/models';

/** Parâmetros das listagens paginadas por cursor (reservas e viagens). */
export interface ListParams {
  cursor?: string;
  limit?: number;
  /** Busca nos campos exibidos — nunca por data; para isso use o intervalo. */
  q?: string;
  dataInicio?: string;
  dataFim?: string;
}

/** Só viagens: filtra por status e inverte a ordem para "a mais próxima primeiro". */
export interface ViagemListParams extends ListParams {
  status?: StatusViagem[];
  ordem?: 'asc' | 'desc';
}

function listQuery({ cursor, limit, q, dataInicio, dataFim, ...rest }: ViagemListParams) {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  if (limit) query.set('limit', String(limit));
  if (q?.trim()) query.set('q', q.trim());
  if (dataInicio) query.set('data_inicio', dataInicio);
  if (dataFim) query.set('data_fim', dataFim);
  if (rest.ordem) query.set('ordem', rest.ordem);
  for (const status of rest.status ?? []) query.append('status', status);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export const reservas = {
  list: (params: ListParams = {}) => api<CursorPage<ReservaComNomes>>(`/reservas/${listQuery(params)}`),
  summary: () => api<ReservaResumo>('/reservas/resumo'),
  listByCliente: (clienteId: number) => api<Reserva[]>(`/clientes/${clienteId}/reservas/`),
  listByVinculo: (clienteId: number, vinculoId: number) => api<Reserva[]>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/`),
  get: (id: number) => api<Reserva>(`/reservas/${id}`),
  create: (clienteId: number, vinculoId: number, payload: JsonRecord) => api<Reserva>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/`, { method: 'POST', body: payload }),
  availability: (clienteId: number, vinculoId: number, query: URLSearchParams) => api<{
    data_viagem: string; turno: string; sentido: string; partida_em: string; fechamento_em: string;
    consultado_em: string; disponivel: boolean;
  }>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/disponibilidade?${query}`),
  update: (id: number, payload: JsonRecord) => api<Reserva>(`/reservas/${id}`, { method: 'PUT', body: payload }),
  cancel: (id: number) => api<Reserva>(`/reservas/${id}/cancelar`, { method: 'POST' }),
  remove: (id: number) => api<void>(`/reservas/${id}`, { method: 'DELETE' }),
};

export const viagens = {
  list: (params: ViagemListParams = {}) => api<CursorPage<ViagemComNomes>>(`/viagens/${listQuery(params)}`),
  summary: () => api<ViagemResumo>('/viagens/resumo'),
  get: (id: number) => api<ViagemComCiclo>(`/viagens/${id}`),
  start: (id: number) => api<Viagem>(`/viagens/${id}/iniciar`, { method: 'POST' }),
  finish: (id: number) => api<Viagem>(`/viagens/${id}/concluir`, { method: 'POST' }),
  cancel: (id: number) => api<Viagem>(`/viagens/${id}/cancelar`, { method: 'POST' }),
  schedules: (id: number) => api<ViagemHorario[]>(`/viagens/${id}/horarios`),
  passengers: (id: number) => api<ViagemReserva[]>(`/viagens/${id}/reservas/`),
  setPresence: (id: number, reservaId: number, status_presenca: StatusPresenca) => api<ViagemReserva>(`/viagens/${id}/reservas/${reservaId}/presenca`, {
    method: 'PUT', body: { status_presenca },
  }),
  location: (id: number) => api<ViagemLocalizacao>(`/viagens/${id}/localizacao`),
  updateLocation: (id: number, payload: JsonRecord) => api<ViagemLocalizacao>(`/viagens/${id}/localizacao`, { method: 'PUT', body: payload }),
  route: (id: number) => api<RotaDinamica>(`/viagens/${id}/rota-dinamica`),
  calculateRoute: (id: number) => api<RotaDinamica>(`/viagens/${id}/rota-dinamica/calcular`, { method: 'POST' }),
  createRoute: (id: number, payload: JsonRecord) => api<RotaDinamica>(`/viagens/${id}/rota-dinamica`, { method: 'POST', body: payload }),
  deleteRoute: (id: number) => api<void>(`/viagens/${id}/rota-dinamica`, { method: 'DELETE' }),
};

export const planejamento = {
  failures: (limit = 50) => api<FalhaPlanejamento[]>(`/planejamentos/execucoes/falhas?limit=${limit}`),
};
