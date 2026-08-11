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
  options: { authenticated?: boolean } = {},
): Promise<ApiMock> {
  let authenticated = options.authenticated ?? false;
  let protectedRoutesFail = false;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');

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

    // Toda listagem da API responde um array; vazio basta para o dashboard render.
    return json(route, []);
  });

  return {
    invalidateProtectedRoutes: () => {
      protectedRoutesFail = true;
    },
    restoreProtectedRoutes: () => {
      protectedRoutesFail = false;
    },
  };
}
