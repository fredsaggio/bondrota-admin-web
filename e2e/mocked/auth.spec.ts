import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import {
  dashboardHeading,
  loginForm,
  loginHeading,
  logoutButton,
  signIn,
  submitLogin,
} from '../support/actions';

test.describe('Autenticacao administrativa', () => {
  test('redireciona para o login quando nao ha sessao', async ({ page }) => {
    await mockApi(page, { authenticated: false });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/$/);
    await expect(loginHeading(page)).toBeVisible();
  });

  test('mostra mensagem amigavel quando as credenciais sao invalidas', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    await page.goto('/');

    await submitLogin(page, { email: 'errado@bondrota.test', senha: 'senha-errada' });

    await expect(loginForm(page).error).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/$/);
  });

  test('autentica com credenciais validas e abre o dashboard', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    await page.goto('/');

    await signIn(page, TEST_ADMIN);

    await expect(logoutButton(page)).toBeVisible();
  });

  test('mantem a sessao apos recarregar a pagina', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    await page.goto('/');
    await signIn(page, TEST_ADMIN);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading(page)).toBeVisible();
  });

  test('leva direto ao dashboard quando ja existe sessao valida', async ({ page }) => {
    await mockApi(page, { authenticated: true });

    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading(page)).toBeVisible();
  });

  test('logout encerra a sessao e bloqueia o dashboard', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    await page.goto('/');
    await signIn(page, TEST_ADMIN);

    await logoutButton(page).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(loginHeading(page)).toBeVisible();

    // A sessao caiu de verdade no servidor, nao so na tela.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/$/);
  });

  test('derruba a sessao quando a API responde 401 numa rota protegida', async ({ page }) => {
    const api = await mockApi(page, { authenticated: false });
    await page.goto('/');
    await signIn(page, TEST_ADMIN);

    // Simula token expirado entre uma navegacao e outra.
    api.invalidateProtectedRoutes();
    await page.reload();

    await expect(page).toHaveURL(/\/$/);
    await expect(loginHeading(page)).toBeVisible();
  });
});
