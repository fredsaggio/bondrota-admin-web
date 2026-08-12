import { expect, test } from '../support/fixtures';
import { makeViagens, mockApi, TEST_ADMIN, type ApiMock } from '../support/api-mock';
import { signIn } from '../support/actions';

const TRANSPARENT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const TOTAL = 120;
const PAGE_SIZE = 50;

type Page = import('@playwright/test').Page;

let api: ApiMock;

test.beforeEach(async ({ page }) => {
  // Os tiles do OpenStreetMap sao externos. Abortar faz o Leaflet ficar tentando
  // de novo e reflowar sem parar, o que move os elementos da barra lateral; um PNG
  // minimo resolve a carga e deixa o mapa assentar.
  await page.route('**://*.tile.openstreetmap.org/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: Buffer.from(TRANSPARENT_PNG, 'base64'),
  }));

  api = await mockApi(page, { viagens: makeViagens(TOTAL) });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/monitoramento');
});

const tripButtons = (page: Page) => page.locator('aside button').filter({ hasText: /^Viagem #/ });
const loadMore = (page: Page) => page.getByRole('button', { name: 'Carregar mais' });

test('a lista de viagens ativas carrega so a primeira pagina', async ({ page }) => {
  await expect(tripButtons(page)).toHaveCount(PAGE_SIZE);
  await expect(loadMore(page)).toBeVisible();
});

/**
 * Antes esta tela pedia um lote fixo de 100 e descartava o next_cursor: viagem
 * alem disso sumia sem aviso. Agora ela usa o mesmo cursor das outras telas.
 */
test('"carregar mais" alcanca viagens alem do primeiro lote', async ({ page }) => {
  await expect(tripButtons(page)).toHaveCount(PAGE_SIZE);

  await loadMore(page).click();
  await expect(tripButtons(page)).toHaveCount(PAGE_SIZE * 2);

  await loadMore(page).click();
  await expect(tripButtons(page)).toHaveCount(TOTAL);
  await expect(loadMore(page)).toBeHidden();
});

test('pede so viagens acompanhaveis, da mais proxima para a mais distante', async ({ page }) => {
  await expect(tripButtons(page)).toHaveCount(PAGE_SIZE);

  const first = api.viagemRequests[0] ?? '';
  expect(first).toContain('status=programada');
  expect(first).toContain('status=em_andamento');
  expect(first, 'ordem crescente: a viagem de hoje nao pode ficar atras das futuras').toContain('ordem=asc');
});
