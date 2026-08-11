import { expect, test } from '../support/fixtures';
import { dashboardHeading, submitLogin } from '../support/actions';

const email = process.env.E2E_ADMIN_EMAIL ?? '';
const senha = process.env.E2E_ADMIN_PASSWORD ?? '';

test.describe('Smoke de autenticacao na stack publicada', () => {
  test.skip(
    !email || !senha,
    'defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para rodar o smoke',
  );

  test('o browser envia o cookie de sessao para a API', async ({ page }) => {
    // Painel e API vivem em dominios diferentes. Se o cookie sair com
    // SameSite=Lax, o browser aceita o login e depois omite o cookie —
    // e este GET responde 401 mesmo com credenciais corretas.
    const sessionStatuses: number[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/admin/session')) {
        sessionStatuses.push(response.status());
      }
    });

    await page.goto('/');
    await submitLogin(page, { email, senha });

    // O primeiro GET /admin/session acontece no mount e responde 401 por
    // design — ainda nao houve login. So interessa se algum chega a 200,
    // porque e isso que prova que o cookie atravessou os dois dominios.
    await expect
      .poll(() => sessionStatuses.filter((status) => status === 200).length, {
        message:
          'GET /admin/session nunca respondeu com sessao apos um login valido: ' +
          'o browser nao enviou o cookie. Verifique AUTH_COOKIE_SAME_SITE=none ' +
          'e AUTH_COOKIE_SECURE=true na API.',
      })
      .toBeGreaterThan(0);
  });

  test('login real abre o dashboard e a sessao sobrevive ao reload', async ({ page }) => {
    await page.goto('/');
    await submitLogin(page, { email, senha });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading(page)).toBeVisible();

    // Recarregar prova que a sessao vive no cookie, e nao em memoria.
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading(page)).toBeVisible();
  });
});
