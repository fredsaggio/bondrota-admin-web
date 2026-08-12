import type { Page, Route } from '@playwright/test';

/** Credenciais aceitas pelo mock. Nao existem em nenhum ambiente real. */
export const TEST_ADMIN = {
  email: 'admin@bondrota.test',
  senha: 'senha-de-teste',
};

export const APP_CONFIG = {
  cidade_base: 'Campo Alegre',
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
}

export interface MockCliente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nasc: string;
  foto: string;
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
      foto: '',
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
  return route.fulfill({ status: 401, contentType: 'text/plain', body: 'unauthorized' });
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
  options: { authenticated?: boolean; reservas?: MockReserva[]; clientes?: MockCliente[] } = {},
): Promise<ApiMock> {
  let authenticated = options.authenticated ?? false;
  let protectedRoutesFail = false;
  const allBookings = options.reservas ?? [];
  const bookingRequests: string[] = [];
  const allClientes = options.clientes ?? [];
  const clienteRequests: string[] = [];

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
          body: 'invalid email or password',
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
        return route.fulfill({ status: 403, contentType: 'text/plain', body: 'senha atual incorreta' });
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

    // Contagens agregadas do painel — o dashboard le totais, nao linhas.
    if (path === '/reservas/resumo') {
      return json(route, { confirmadas_total: 0, confirmadas_por_turno: {} });
    }
    if (path === '/viagens/resumo') {
      return json(route, {
        por_status: {}, por_turno: {}, hoje_total: 0, hoje_em_andamento: 0, proximas: [],
      });
    }
    if (path === '/viagens/') {
      return json(route, { items: [], has_more: false });
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
  };
}
