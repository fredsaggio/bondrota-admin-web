import { expect, type Page } from '@playwright/test';

/** Campos da tela de login (`login-page.tsx`). */
export function loginForm(page: Page) {
  return {
    email: page.locator('#email'),
    senha: page.locator('#senha'),
    submit: page.getByRole('button', { name: /entrar agora/i }),
    error: page.locator('form p.text-red-500'),
  };
}

export function loginHeading(page: Page) {
  return page.getByRole('heading', { name: 'Sistema BondRota' });
}

export function dashboardHeading(page: Page) {
  return page.getByRole('heading', { name: 'Visão geral' });
}

export function logoutButton(page: Page) {
  return page.getByRole('button', { name: 'Sair' });
}

/** Preenche e envia o formulario de login. Nao afirma o resultado. */
export async function submitLogin(
  page: Page,
  credentials: { email: string; senha: string },
) {
  const form = loginForm(page);
  await form.email.fill(credentials.email);
  await form.senha.fill(credentials.senha);
  await form.submit.click();
}

/** Faz login e espera o dashboard carregar. */
export async function signIn(
  page: Page,
  credentials: { email: string; senha: string },
) {
  await submitLogin(page, credentials);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dashboardHeading(page)).toBeVisible();
}
