import { api, uploadToSignedURL } from '@/lib/api';
import type {
  Admin, AppConfig, Cliente, Destino, FalhaPlanejamento, HorarioTurno, Motorista,
  Municipio, Parada, Reserva, RotaDinamica, RotaInterna, StatusPresenca, Veiculo,
  Viagem, ViagemComCiclo, ViagemHorario, ViagemLocalizacao, ViagemReserva, Vinculo,
} from '@/types/domain';

type JsonRecord = Record<string, unknown>;

const collection = <T>(path: string) => ({
  list: () => api<T[]>(`${path}/`),
  get: (id: number) => api<T>(`${path}/${id}`),
  create: (payload: JsonRecord) => api<T>(`${path}/`, { method: 'POST', body: payload }),
  update: (id: number, payload: JsonRecord) => api<T>(`${path}/${id}`, { method: 'PUT', body: payload }),
  remove: (id: number) => api<void>(`${path}/${id}`, { method: 'DELETE' }),
});

export const admins = collection<Admin>('/admin');
export const destinos = {
  ...collection<Destino>('/destinos'),
  listByMunicipio: (municipioId: number) => api<Destino[]>(`/destinos/municipio/${municipioId}`),
};
export const paradas = collection<Parada>('/paradas');
export const veiculos = collection<Veiculo>('/veiculos');
export const motoristas = collection<Motorista>('/motoristas');
export const clientes = collection<Cliente>('/clientes');
export const horarios = collection<HorarioTurno>('/horarios-turno-viagem');

export const config = {
  get: () => api<AppConfig>('/config', { auth: false }),
};

export const municipios = {
  listByUF: (uf: string) => api<Municipio[]>(`/municipios/?uf=${encodeURIComponent(uf)}`),
};

export const rotasInternas = {
  list: () => api<RotaInterna[]>('/rotas-internas/'),
  get: (id: number) => api<RotaInterna>(`/rotas-internas/${id}`),
  create: (paradaIds: number[]) => api<RotaInterna>('/rotas-internas/', {
    method: 'POST',
    body: { paradas: paradaIds.map((parada_id, index) => ({ parada_id, ordem: index + 1 })) },
  }),
  update: (id: number, paradaIds: number[]) => api<RotaInterna>(`/rotas-internas/${id}/paradas`, {
    method: 'PUT',
    body: { paradas: paradaIds.map((parada_id, index) => ({ parada_id, ordem: index + 1 })) },
  }),
  remove: (id: number) => api<void>(`/rotas-internas/${id}`, { method: 'DELETE' }),
};

export const vinculos = {
  list: (clienteId: number) => api<Vinculo[]>(`/clientes/${clienteId}/vinculos/`),
  get: (clienteId: number, id: number) => api<Vinculo>(`/clientes/${clienteId}/vinculos/${id}`),
  create: (clienteId: number, payload: JsonRecord) => api<Vinculo>(`/clientes/${clienteId}/vinculos/`, {
    method: 'POST', body: payload,
  }),
  update: (clienteId: number, id: number, payload: JsonRecord) => api<Vinculo>(`/clientes/${clienteId}/vinculos/${id}`, {
    method: 'PUT', body: payload,
  }),
  remove: (clienteId: number, id: number) => api<void>(`/clientes/${clienteId}/vinculos/${id}`, { method: 'DELETE' }),
};

export const reservas = {
  list: () => api<Reserva[]>('/reservas/'),
  listByCliente: (clienteId: number) => api<Reserva[]>(`/clientes/${clienteId}/reservas/`),
  listByVinculo: (clienteId: number, vinculoId: number) => api<Reserva[]>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/`),
  get: (id: number) => api<Reserva>(`/reservas/${id}`),
  create: (clienteId: number, vinculoId: number, payload: JsonRecord) => api<Reserva>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/`, {
    method: 'POST', body: payload,
  }),
  availability: (clienteId: number, vinculoId: number, query: URLSearchParams) => api<{
    data_viagem: string;
    turno: string;
    sentido: string;
    partida_em: string;
    fechamento_em: string;
    consultado_em: string;
    disponivel: boolean;
  }>(`/clientes/${clienteId}/vinculos/${vinculoId}/reservas/disponibilidade?${query}`),
  update: (id: number, payload: JsonRecord) => api<Reserva>(`/reservas/${id}`, { method: 'PUT', body: payload }),
  cancel: (id: number) => api<Reserva>(`/reservas/${id}/cancelar`, { method: 'POST' }),
  remove: (id: number) => api<void>(`/reservas/${id}`, { method: 'DELETE' }),
};

export const viagens = {
  list: () => api<ViagemComCiclo[]>('/viagens/'),
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

export const storage = {
  signedUpload: (payload: { bucket: 'fotos' | 'documentos'; path: string; content_type: string; upsert?: boolean }) => api<{
    bucket: string; path: string; signed_url: string; token?: string;
  }>('/storage/signed-upload-url', { method: 'POST', body: payload }),
  signedDownload: (payload: { bucket: 'fotos' | 'documentos'; path: string; expires_in_seconds?: number }) => api<{
    bucket: string; path: string; signed_url: string; expires_in_seconds: number;
  }>('/storage/signed-download-url', { method: 'POST', body: payload }),
  async upload(file: File, bucket: 'fotos' | 'documentos', folder: string) {
    const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const signed = await this.signedUpload({
      bucket,
      path: `${folder}/${crypto.randomUUID()}-${clean}`,
      content_type: file.type || 'application/octet-stream',
      upsert: false,
    });
    await uploadToSignedURL(signed.signed_url, file);
    return signed.path;
  },
};
