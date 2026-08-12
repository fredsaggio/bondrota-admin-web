import { api, uploadToSignedURL } from '@/shared/infrastructure/http/api-client';
import { createRestCollection, type JsonRecord } from '@/shared/infrastructure/http/rest-collection';
import type { CursorPage } from '@/shared/domain/pagination';
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
// `list` fica de fora de propósito: `GET /clientes/` agora responde um envelope
// paginado, e manter o método herdado (tipado como `Cliente[]`) deixaria um erro
// de runtime invisível para o typecheck. Quem precisa da listagem usa `page`.
const clienteRest = (() => {
  const { list, ...rest } = createRestCollection<Cliente>('/clientes');
  void list;
  return rest;
})();

export const clientes = {
  ...clienteRest,
  /**
   * Listagem paginada por cursor. A tabela de clientes cresce indefinidamente —
   * a retenção apaga reservas e viagens, mas nunca cliente.
   */
  page: (params: { cursor?: string; limit?: number; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.q?.trim()) query.set('q', params.q.trim());
    const suffix = query.toString();
    return api<CursorPage<Cliente>>(`/clientes/${suffix ? `?${suffix}` : ''}`);
  },
  summary: () => api<{ total: number }>('/clientes/resumo'),
};
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
  /**
   * Listagem administrativa paginada por cursor, com nome do cliente e do destino
   * já resolvidos. Vínculo cresce junto com cliente e não é apagado pela retenção.
   */
  page: (params: { cursor?: string; limit?: number; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.q?.trim()) query.set('q', params.q.trim());
    const suffix = query.toString();
    return api<CursorPage<VinculoComCliente>>(`/vinculos/${suffix ? `?${suffix}` : ''}`);
  },
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
  /**
   * `filename` é fixo por slot (ex.: "foto", "comprovante-estudante"), não um
   * nome gerado por upload — com `upsert`, reenviar o mesmo slot substitui o
   * arquivo anterior em vez de acumular um órfão a cada troca de foto. O
   * caminho (`folder`) já vem pronto de quem chama: caminho definitivo quando
   * o registro já tem ID, ou uma pasta de espera quando ainda não tem — nesse
   * caso o backend move para o lugar certo depois que o registro é criado.
   */
  async upload(file: File, bucket: 'fotos' | 'documentos', folder: string, filename: string) {
    const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
    const signed = await this.signedUpload({
      bucket,
      path: `${folder}/${filename}${ext}`,
      content_type: file.type || 'application/octet-stream',
      upsert: true,
    });
    await uploadToSignedURL(signed.signed_url, file);
    return signed.path;
  },
};
