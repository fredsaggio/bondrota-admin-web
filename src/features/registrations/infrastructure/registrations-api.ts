import { api, uploadToSignedURL } from '@/shared/infrastructure/http/api-client';
import { createRestCollection, type JsonRecord } from '@/shared/infrastructure/http/rest-collection';
import type { Cliente, Destino, HorarioTurno, Motorista, Municipio, Parada, RotaInterna, Veiculo, Vinculo, VinculoComCliente } from '@/features/registrations/domain/models';

// Administradores não são gerenciados pelo painel: criar/editar/remover admin é
// feito fora da aplicação, com acesso direto ao banco, para que uma sessão de
// admin comprometida não consiga criar novos acessos nem apagar os existentes.
export const destinos = {
  ...createRestCollection<Destino>('/destinos'),
  listByMunicipio: (municipioId: number) => api<Destino[]>(`/destinos/municipio/${municipioId}`),
};
export const paradas = createRestCollection<Parada>('/paradas');
export const veiculos = createRestCollection<Veiculo>('/veiculos');
export const motoristas = createRestCollection<Motorista>('/motoristas');
export const clientes = createRestCollection<Cliente>('/clientes');
export const horarios = createRestCollection<HorarioTurno>('/horarios-turno-viagem');

export const municipios = {
  listByUF: (uf: string) => api<Municipio[]>(`/municipios/?uf=${encodeURIComponent(uf)}`),
  get: (codigoIbge: number) => api<Municipio>(`/municipios/${codigoIbge}`),
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
  /** Listagem administrativa de todos os vínculos, com o nome do cliente já resolvido. */
  list: () => api<VinculoComCliente[]>('/vinculos/'),
  listByCliente: (clienteId: number) => api<Vinculo[]>(`/clientes/${clienteId}/vinculos/`),
  get: (clienteId: number, id: number) => api<Vinculo>(`/clientes/${clienteId}/vinculos/${id}`),
  create: (clienteId: number, payload: JsonRecord) => api<Vinculo>(`/clientes/${clienteId}/vinculos/`, { method: 'POST', body: payload }),
  update: (clienteId: number, id: number, payload: JsonRecord) => api<Vinculo>(`/clientes/${clienteId}/vinculos/${id}`, { method: 'PUT', body: payload }),
  remove: (clienteId: number, id: number) => api<void>(`/clientes/${clienteId}/vinculos/${id}`, { method: 'DELETE' }),
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
