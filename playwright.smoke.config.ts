import { defineConfig } from '@playwright/test';

/**
 * Smoke contra a stack publicada (Vercel + Render + Supabase), sem mocks.
 *
 * Existe para cobrir o que a suite mockada nao alcanca: atributos do cookie
 * de sessao, CORS e variaveis de ambiente do deploy. Foi essa classe de falha
 * (`SameSite=Lax` entre `vercel.app` e `onrender.com`) que quebrou o login
 * em producao sem nenhum teste perceber.
 *
 * Requer E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD; sem elas os testes sao pulados.
 */
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // O login da API limita 5 tentativas por identidade a cada minuto,
  // entao nao paralelizamos nem repetimos automaticamente.
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 90_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://bondrota-admin-web.vercel.app',
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
