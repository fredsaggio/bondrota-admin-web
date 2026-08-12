import { expect, test } from '../support/fixtures';
import { makeVinculos, mockApi, TEST_ADMIN, type ApiMock } from '../support/api-mock';
import { signIn } from '../support/actions';

const TOTAL = 120;
const PAGE_SIZE = 50;

type Page = import('@playwright/test').Page;

let api: ApiMock;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, { vinculos: makeVinculos(TOTAL) });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  await page.getByRole('button', { name: 'Vínculos' }).click();
});

const rows = (page: Page) => page.locator('table.data-table tbody tr');
const loadMore = (page: Page) => page.getByRole('button', { name: 'Carregar mais' });
const searchBox = (page: Page) => page.getByRole('textbox', { name: /pesquisar/i });

test('carrega so a primeira pagina de vinculos', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  await expect(loadMore(page)).toBeVisible();
});

test('"carregar mais" acumula sem descartar a pagina anterior', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  const first = await rows(page).first().textContent();

  await loadMore(page).click();
  await expect(rows(page)).toHaveCount(PAGE_SIZE * 2);
  expect(await rows(page).first().textContent()).toBe(first);
});

test('busca vai ao servidor e acha fora das paginas carregadas', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  // Cliente 117 esta na terceira pagina; so aparece se a busca for server-side.
  await searchBox(page).fill('Cliente 117');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Cliente 117');

  const queries = api.vinculoRequests.filter((search) => search.includes('q=Cliente'));
  expect(queries.length, 'a busca precisa chegar na API').toBeGreaterThan(0);
});

/**
 * O destino era exibido como id cru. Agora a API resolve o nome via JOIN, no
 * mesmo movimento que trouxe a paginacao.
 */
test('a coluna destino mostra o nome, nao o id', async ({ page }) => {
  await expect(rows(page).first()).toContainText('Campus Central');
});
