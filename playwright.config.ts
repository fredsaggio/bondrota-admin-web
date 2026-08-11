import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Suite principal de E2E: sobe o Next localmente e intercepta a API no browser.
 * Nao depende de backend nem de credenciais, entao roda em todo PR.
 *
 * Para validar cookie/CORS contra a stack publicada, use `playwright.smoke.config.ts`.
 */
export default defineConfig({
  testDir: './e2e/mocked',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Fixa a base da API para o glob de interceptacao ser deterministico.
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1' },
  },
});
