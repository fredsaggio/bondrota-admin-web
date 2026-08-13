import type { Page, Route } from '@playwright/test';

/** Credenciais aceitas pelo mock. Nao existem em nenhum ambiente real. */
export const TEST_ADMIN = {
  email: 'admin@bondrota.test',
  senha: 'senha-de-teste',
};

export const APP_CONFIG = {
  cidade_base: 'Campo Alegre',
  latitude_base: -9.7799,
  longitude_base: -36.3576,
  fuso_horario: 'America/Maceio',
};

const SESSION_TTL_MS = 60 * 60 * 1000;

export interface ApiMock {
  /** Passa a responder 401 nas rotas protegidas, simulando um token invalidado. */
  invalidateProtectedRoutes(): void;
  /** Volta a responder normalmente nas rotas protegidas. */
  restoreProtectedRoutes(): void;
  /** Query strings recebidas em `GET /reservas/`, na ordem, para afirmar o que o front pediu. */
  bookingRequests: string[];
  /** Query strings recebidas em `GET /clientes/`, na ordem. */
  clienteRequests: string[];
  /** Query strings recebidas em `GET /vinculos/`, na ordem. */
  vinculoRequests: string[];
  /** Query strings recebidas em `GET /viagens/`, na ordem. */
  viagemRequests: string[];
  /** Caminhos pedidos em `POST /storage/signed-upload-url`, na ordem. */
  uploadRequests: string[];
}

export interface MockViagem {
  viagem: { id: number; ciclo_viagem_id: number; sentido: string; status: string; created_at: string; updated_at: string };
  ciclo: {
    id: number; data_viagem: string; turno: string; municipio_destino_id: number; rota_interna_id: number;
    veiculo_id: number; motorista_id: number; status: string; expires_at: string; created_at: string; updated_at: string;
  };
  municipio_nome: string;
  veiculo_placa: string;
}

/** Viagens ativas em ordem crescente de data, como o monitoramento pede. */
export function makeViagens(total: number): MockViagem[] {
  return Array.from({ length: total }, (_, index) => {
    const id = index + 1;
    const day = String((index % 28) + 1).padStart(2, '0');
    return {
      viagem: { id, ciclo_viagem_id: id, sentido: 'ida', status: 'programada', created_at: '', updated_at: '' },
      ciclo: {
        id, data_viagem: `2026-09-${day}`, turno: 'NT', municipio_destino_id: 2704302, rota_interna_id: 1,
        veiculo_id: 1, motorista_id: 1, status: 'planejado', expires_at: '', created_at: '', updated_at: '',
      },
      municipio_nome: 'Maceio',
      veiculo_placa: 'ABC1D23',
    };
  });
}

export interface MockVinculo {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  tipo: string;
  turno: string;
  destino_id: number;
  destino_nome: string;
  rota_interna_id: number;
  curso: string;
  comprovante: string;
  validade: string;
  horarios_fixos: Array<{ id: number; vinculo_id: number; dia_semana: number }>;
}

/** Nomes em ordem alfabetica, como a API ordena a listagem de vinculos. */
export function makeVinculos(total: number): MockVinculo[] {
  return Array.from({ length: total }, (_, index) => {
    const id = index + 1;
    return {
      id,
      cliente_id: 100 + id,
      cliente_nome: `Cliente ${String(id).padStart(3, '0')}`,
      tipo: 'estudante',
      turno: 'NT',
      destino_id: 1,
      destino_nome: 'Campus Central',
      rota_interna_id: 1,
      curso: 'Computacao',
      comprovante: '',
      validade: '2030-12-31',
      horarios_fixos: [1, 2, 3, 4, 5].map((dia) => ({ id: id * 10 + dia, vinculo_id: id, dia_semana: dia })),
    };
  });
}

export interface MockCliente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nasc: string;
  documento_identificacao: string;
  comprovante_residencia: string;
}

export function makeClientes(total: number): MockCliente[] {
  return Array.from({ length: total }, (_, index) => {
    const id = total - index;
    return {
      id,
      nome: `Cliente ${id}`,
      cpf: String(30000000000 + id),
      telefone: `8299999${String(id).padStart(4, '0')}`,
      data_nasc: '2002-08-10',
      documento_identificacao: `clientes/${id}/documento-identificacao.pdf`,
      comprovante_residencia: `clientes/${id}/comprovante-residencia.pdf`,
    };
  });
}

export interface MockReserva {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  vinculo_id: number;
  data_viagem: string;
  turno: string;
  destino_id: number;
  destino_nome: string;
  rota_interna_id: number;
  sentido: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Gera reservas com datas decrescentes, na mesma ordem que a API devolve. */
export function makeReservas(total: number): MockReserva[] {
  return Array.from({ length: total }, (_, index) => {
    const day = String(28 - (index % 28)).padStart(2, '0');
    return {
      id: total - index,
      cliente_id: 100 + index,
      cliente_nome: `Cliente ${total - index}`,
      vinculo_id: 200 + index,
      data_viagem: `2026-09-${day}`,
      turno: 'NT',
      destino_id: 300 + index,
      destino_nome: `Destino ${total - index}`,
      rota_interna_id: 1,
      sentido: 'ida',
      status: 'confirmada',
      created_at: '2026-08-01T12:00:00Z',
      updated_at: '2026-08-01T12:00:00Z',
    };
  });
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function unauthorized(route: Route) {
  return route.fulfill({ status: 401, contentType: 'text/plain', body: 'Sua sessão expirou. Entre novamente.' });
}

/** Municipios de AL usados pelo seletor dos destinos. */
export const MOCK_MUNICIPIOS = [
  { codigo_ibge: 2700300, nome: 'Arapiraca', uf: 'AL', ativo: true },
  { codigo_ibge: 2701407, nome: 'Campo Alegre', uf: 'AL', ativo: true },
];

/** PNG 1x1 transparente. O desenho do tile nao afeta nada que a suite afirma. */
const BLANK_TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** Area do municipio devolvida pelo Nominatim mocado: [sul, norte, oeste, leste]. */
export const MOCK_MUNICIPIO_BOUNDS = ['-9.8820000', '-9.6354476', '-36.7544638', '-36.5410000'];

/**
 * Resultados da busca livre de endereco. Dois trechos da mesma avenida, como o
 * Nominatim realmente devolve — e por isso o painel mostra uma lista em vez de
 * aceitar o primeiro.
 */
export const MOCK_ENDERECOS = [
  {
    place_id: 101,
    display_name: 'Avenida Fernandes Lima, Gruta de Lourdes, Maceió, Alagoas, Brasil',
    lat: '-9.6210292',
    lon: '-35.7390682',
    boundingbox: ['-9.6220000', '-9.6200000', '-35.7400000', '-35.7380000'],
    address: { road: 'Avenida Fernandes Lima', suburb: 'Gruta de Lourdes', city: 'Maceió' },
  },
  {
    place_id: 102,
    display_name: 'Avenida Fernandes Lima, Pitanguinha, Maceió, Alagoas, Brasil',
    lat: '-9.6354560',
    lon: '-35.7362840',
    boundingbox: ['-9.6360000', '-9.6350000', '-35.7370000', '-35.7355000'],
    address: { road: 'Avenida Fernandes Lima', house_number: '1250', suburb: 'Pitanguinha', city: 'Maceió' },
  },
];

/** Logradouro que o `/reverse` mocado devolve para qualquer ponto clicado. */
export const MOCK_RUA_REVERSA = 'Rua Doutor Osvaldo Sarmento';

/**
 * A suite mocada roda offline e em todo PR. Os mapas do painel buscariam tiles
 * do OpenStreetMap e dois tipos de geocoding no Nominatim; deixar isso sair
 * para a rede real tornaria os testes lentos e instaveis, e os quebraria em
 * qualquer maquina sem internet. Tudo vira resposta fixa aqui.
 */
async function stubMapNetwork(page: Page) {
  await page.route(/tile\.openstreetmap\.org/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }));

  await page.route(/nominatim\.openstreetmap\.org/, (route) => {
    const url = new URL(route.request().url());
    // Tres consumos diferentes: `/reverse` resolve a rua de um ponto clicado,
    // `q` e a busca livre de endereco e `city` e a estruturada do municipio.
    const corpo = url.pathname.endsWith('/reverse')
      ? { address: { road: MOCK_RUA_REVERSA, city: 'Campo Alegre' } }
      : url.searchParams.get('q')
        ? MOCK_ENDERECOS
        : [{ boundingbox: MOCK_MUNICIPIO_BOUNDS }];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
  });
}

/** Aceita o PUT no destino fabricado pelo mock de signed-upload-url, sem sair para a rede real. */
async function stubUploadTarget(page: Page) {
  await page.route(/mock-upload\.test/, (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
}

/**
 * Reproduz o contrato de sessao da API (`/admin/login`, `/admin/session`,
 * `/admin/logout`) mantendo estado entre as requisicoes, como o backend faz.
 *
 * O que este mock NAO cobre, por rodar antes do cookie sair do browser:
 * atributos de cookie (SameSite/Secure/Domain) e CORS. Essa classe de falha
 * — a que quebrou o login em producao — e coberta pela suite de smoke.
 */
export async function mockApi(
  page: Page,
  options: { authenticated?: boolean; reservas?: MockReserva[]; clientes?: MockCliente[]; vinculos?: MockVinculo[]; viagens?: MockViagem[]; motoristas?: Record<string, unknown>[] } = {},
): Promise<ApiMock> {
  let authenticated = options.authenticated ?? false;
  let protectedRoutesFail = false;
  const allBookings = options.reservas ?? [];
  const bookingRequests: string[] = [];
  const allClientes = options.clientes ?? [];
  const clienteRequests: string[] = [];
  const allVinculos = options.vinculos ?? [];
  const vinculoRequests: string[] = [];
  const allViagens = options.viagens ?? [];
  const viagemRequests: string[] = [];
  const uploadRequests: string[] = [];

  await stubMapNetwork(page);
  await stubUploadTarget(page);

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');

    if (method === 'OPTIONS') return route.fulfill({ status: 204 });

    // Publico: o front busca a config sem autenticacao.
    if (path === '/config') return json(route, APP_CONFIG);

    if (path === '/admin/login' && method === 'POST') {
      const body = request.postDataJSON() as { email?: string; senha?: string } | null;
      const valid = body?.email === TEST_ADMIN.email && body?.senha === TEST_ADMIN.senha;
      if (!valid) {
        return route.fulfill({
          status: 401,
          contentType: 'text/plain',
          body: 'E-mail ou senha inválidos.',
        });
      }
      authenticated = true;
      return route.fulfill({ status: 204 });
    }

    if (path === '/admin/logout' && method === 'POST') {
      authenticated = false;
      return route.fulfill({ status: 204 });
    }

    // Espelha o contrato da troca de senha, incluindo o 403 (e nao 401) para senha
    // atual errada — e justamente esse status que impede o painel de deslogar quem
    // so errou a digitacao.
    if (path === '/admin/senha' && method === 'PUT') {
      if (!authenticated) return unauthorized(route);
      const body = request.postDataJSON() as { senha_atual?: string; nova_senha?: string } | null;
      if (body?.senha_atual !== TEST_ADMIN.senha) {
        return route.fulfill({ status: 403, contentType: 'text/plain', body: 'A senha atual está incorreta.' });
      }
      if ((body?.nova_senha ?? '').length < 8) {
        return route.fulfill({
          status: 400,
          contentType: 'text/plain',
          body: 'a senha precisa de pelo menos 8 caracteres',
        });
      }
      return route.fulfill({ status: 204 });
    }

    if (path === '/admin/session') {
      if (!authenticated) return unauthorized(route);
      return json(route, {
        user_id: 1,
        role: 'admin',
        expires_at: Date.now() + SESSION_TTL_MS,
      });
    }

    // Demais rotas exigem sessao, como no backend.
    if (!authenticated || protectedRoutesFail) return unauthorized(route);

    if (path === '/storage/signed-upload-url' && method === 'POST') {
      const body = request.postDataJSON() as { bucket?: string; path?: string };
      uploadRequests.push(body.path ?? '');
      return json(route, {
        bucket: body.bucket,
        path: body.path,
        signed_url: `https://mock-upload.test/${body.bucket}/${body.path}`,
        token: 'mock-token',
      });
    }

    // Contagens agregadas do painel — o dashboard le totais, nao linhas.
    if (path === '/reservas/resumo') {
      return json(route, { confirmadas_total: 0, confirmadas_por_turno: {} });
    }
    if (path === '/viagens/resumo') {
      return json(route, {
        por_status: {}, por_turno: {}, hoje_total: 0, hoje_em_andamento: 0, proximas: [],
      });
    }
    // Sem localizacao/rota calculada ainda. O catch-all abaixo responderia `[]`,
    // que e truthy — o painel entraria no ramo "tem localizacao" e quebraria ao
    // formatar velocidade. O front ja trata 404 como "ainda nao transmitiu".
    if (/^\/viagens\/\d+\/(localizacao|rota-dinamica)$/.test(path)) {
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    }

    if (path === '/viagens/') {
      viagemRequests.push(url.search);

      const busca = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const status = url.searchParams.getAll('status');

      const matching = allViagens.filter((item) => {
        if (status.length > 0 && !status.includes(item.viagem.status)) return false;
        if (!busca) return true;
        return [item.municipio_nome, item.veiculo_placa, item.viagem.status, item.ciclo.turno, item.viagem.sentido]
          .join(' ').toLowerCase().includes(busca);
      });

      const offset = Number(atob(url.searchParams.get('cursor') ?? '') || 0);
      const slice = matching.slice(offset, offset + limit);
      const next = offset + slice.length;
      const hasMore = next < matching.length;

      return json(route, {
        items: slice,
        has_more: hasMore,
        ...(hasMore ? { next_cursor: btoa(String(next)) } : {}),
      });
    }
    if (path === '/vinculos/') {
      vinculoRequests.push(url.search);

      const busca = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const limit = Number(url.searchParams.get('limit') ?? 50);

      const matching = allVinculos.filter((item) => {
        if (!busca) return true;
        return [item.cliente_nome, item.destino_nome, item.curso, item.tipo, item.turno]
          .join(' ').toLowerCase().includes(busca);
      });

      const offset = Number(atob(url.searchParams.get('cursor') ?? '') || 0);
      const slice = matching.slice(offset, offset + limit);
      const next = offset + slice.length;
      const hasMore = next < matching.length;

      return json(route, {
        items: slice,
        has_more: hasMore,
        ...(hasMore ? { next_cursor: btoa(String(next)) } : {}),
      });
    }
    if (path === '/clientes/resumo') {
      return json(route, { total: allClientes.length });
    }
    if (path === '/clientes/') {
      clienteRequests.push(url.search);

      const busca = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const limit = Number(url.searchParams.get('limit') ?? 50);
      // Igual ao backend: termo com letra nao dispara a busca por documento.
      const digitos = /\p{L}/u.test(busca) ? '' : busca.replace(/\D/g, '');

      const matching = allClientes.filter((item) => {
        if (!busca) return true;
        if (item.nome.toLowerCase().includes(busca)) return true;
        if (item.telefone.includes(busca)) return true;
        return digitos !== '' && item.cpf.includes(digitos);
      });

      const offset = Number(atob(url.searchParams.get('cursor') ?? '') || 0);
      const slice = matching.slice(offset, offset + limit);
      const next = offset + slice.length;
      const hasMore = next < matching.length;

      return json(route, {
        items: slice,
        has_more: hasMore,
        ...(hasMore ? { next_cursor: btoa(String(next)) } : {}),
      });
    }

    // Listagem paginada por cursor: aplica busca, intervalo de data e recorte,
    // como o backend faz, para o teste exercitar o fluxo de verdade.
    if (path === '/reservas/') {
      bookingRequests.push(url.search);

      const busca = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const dataInicio = url.searchParams.get('data_inicio');
      const dataFim = url.searchParams.get('data_fim');
      const limit = Number(url.searchParams.get('limit') ?? 50);

      const matching = allBookings.filter((item) => {
        if (dataInicio && item.data_viagem < dataInicio) return false;
        if (dataFim && item.data_viagem > dataFim) return false;
        if (!busca) return true;
        // A data fica fora da busca livre, igual ao backend.
        return [item.cliente_nome, item.destino_nome, item.status, item.turno, item.sentido]
          .join(' ').toLowerCase().includes(busca);
      });

      // O cursor e opaco para o front; aqui ele carrega so o deslocamento.
      const offset = Number(atob(url.searchParams.get('cursor') ?? '') || 0);
      const slice = matching.slice(offset, offset + limit);
      const next = offset + slice.length;
      const hasMore = next < matching.length;

      return json(route, {
        items: slice,
        has_more: hasMore,
        ...(hasMore ? { next_cursor: btoa(String(next)) } : {}),
      });
    }

    if (path === '/motoristas/' && method === 'GET') {
      return json(route, options.motoristas ?? []);
    }

    // Catalogo de municipios: o seletor dos destinos precisa de opcoes reais
    // para o mapa reagir a escolha.
    if (path === '/municipios/') {
      const uf = url.searchParams.get('uf') ?? '';
      return json(route, MOCK_MUNICIPIOS.filter((item) => item.uf === uf));
    }

    // As demais listagens ainda respondem um array; vazio basta para renderizar.
    return json(route, []);
  });

  return {
    invalidateProtectedRoutes: () => {
      protectedRoutesFail = true;
    },
    restoreProtectedRoutes: () => {
      protectedRoutesFail = false;
    },
    bookingRequests,
    clienteRequests,
    vinculoRequests,
    viagemRequests,
    uploadRequests,
  };
}
