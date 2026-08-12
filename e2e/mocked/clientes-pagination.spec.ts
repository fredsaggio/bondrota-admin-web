import { expect, test } from '../support/fixtures';
import { makeClientes, mockApi, TEST_ADMIN, type ApiMock } from '../support/api-mock';
import { signIn } from '../support/actions';

const TOTAL = 120;
const PAGE_SIZE = 50;

type Page = import('@playwright/test').Page;

let api: ApiMock;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, { clientes: makeClientes(TOTAL) });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  await page.getByRole('button', { name: 'Clientes' }).click();
});

const rows = (page: Page) => page.locator('table.data-table tbody tr');
const loadMore = (page: Page) => page.getByRole('button', { name: 'Carregar mais' });
const searchBox = (page: Page) => page.getByRole('textbox', { name: /pesquisar/i });

test('a aba de clientes carrega so a primeira pagina', async ({ page }) => {
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

test('busca de cliente vai ao servidor e acha fora das paginas carregadas', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  // "Cliente 13" e unico e esta fora da primeira pagina (ids 120..71).
  await searchBox(page).fill('Cliente 13');
  await expect(rows(page)).toHaveCount(1);

  const queries = api.clienteRequests.filter((search) => search.includes('q=Cliente'));
  expect(queries.length, 'a busca precisa chegar na API').toBeGreaterThan(0);
});

/**
 * O motivo de a aba nao refiltrar em memoria: o servidor tambem casa por CPF e
 * telefone, que nao sao colunas da tabela. Um filtro local jogaria fora esses
 * resultados e a busca por CPF pareceria quebrada.
 */
test('busca por CPF funciona mesmo nao sendo coluna da tabela', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  await searchBox(page).fill('30000000013');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Cliente 13');
});

test('outras abas continuam sem paginacao', async ({ page }) => {
  await page.getByRole('button', { name: 'Destinos' }).click();
  await expect(loadMore(page)).toBeHidden();
});
