import { expect, test } from '../support/fixtures';
import { makeReservas, mockApi, TEST_ADMIN, type ApiMock } from '../support/api-mock';
import { signIn } from '../support/actions';

/** A API devolve 50 por página; 120 registros garantem três páginas. */
const TOTAL = 120;
const PAGE_SIZE = 50;

let api: ApiMock;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, { reservas: makeReservas(TOTAL) });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/operacao');
});

type Page = import('@playwright/test').Page;

const rows = (page: Page) => page.locator('table.data-table tbody tr');
const loadMore = (page: Page) => page.getByRole('button', { name: 'Carregar mais' });
const searchBox = (page: Page) => page.getByRole('textbox', { name: 'Pesquisar' });
// `exact` importa: sem ele, "De" casa tambem com o botao "Open Next.js Dev Tools".
const dateFrom = (page: Page) => page.getByLabel('De', { exact: true });
const dateTo = (page: Page) => page.getByLabel('Até', { exact: true });

test('carrega so a primeira pagina, nao a tabela inteira', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  await expect(loadMore(page)).toBeVisible();
});

test('"carregar mais" acumula a proxima pagina sem descartar a anterior', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  const first = await rows(page).first().textContent();

  await loadMore(page).click();
  await expect(rows(page)).toHaveCount(PAGE_SIZE * 2);

  // A primeira linha continua a mesma: a pagina nova foi anexada, nao trocada.
  expect(await rows(page).first().textContent()).toBe(first);

  await loadMore(page).click();
  await expect(rows(page)).toHaveCount(TOTAL);
  // Sem mais paginas, o botao desaparece em vez de pedir uma pagina vazia.
  await expect(loadMore(page)).toBeHidden();
});

test('busca vai ao servidor e reinicia a lista, em vez de filtrar o que ja carregou', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  await loadMore(page).click();
  await expect(rows(page)).toHaveCount(PAGE_SIZE * 2);

  // "Cliente 13" e unico (nao existe "Cliente 13x") e esta fora das duas paginas
  // ja carregadas, que cobrem os ids 120..21. Achar esse registro so e possivel
  // se a busca for ao servidor em vez de filtrar o que esta em memoria.
  await searchBox(page).fill('Cliente 13');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Cliente 13');

  const queries = api.bookingRequests.filter((search) => search.includes('q=Cliente'));
  expect(queries.length, 'a busca precisa chegar na API como query param').toBeGreaterThan(0);
  expect(queries.at(-1), 'busca nova comeca da primeira pagina').not.toContain('cursor=');
});

test('debounce evita uma requisicao por tecla digitada', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  const before = api.bookingRequests.length;

  await searchBox(page).pressSequentially('Cliente', { delay: 30 });
  await expect(rows(page).first()).toContainText('Cliente');

  const requests = api.bookingRequests.length - before;
  expect(requests, `esperava poucas requisicoes para 7 teclas, veio ${requests}`).toBeLessThanOrEqual(3);
});

test('filtro de intervalo de data vira query param e recorta o resultado', async ({ page }) => {
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  await dateFrom(page).fill('2026-09-28');
  await dateTo(page).fill('2026-09-28');

  // Preencher os dois campos dispara duas buscas; espera a que ja leva o intervalo
  // completo, em vez de afirmar sobre a requisicao intermediaria.
  await expect
    .poll(() => api.bookingRequests.at(-1) ?? '')
    .toMatch(/data_inicio=2026-09-28.*data_fim=2026-09-28/);

  // makeReservas repete o dia a cada 28 registros: 120 itens dao 5 no dia 28.
  await expect(rows(page)).toHaveCount(5);

  await page.getByRole('button', { name: 'Limpar' }).click();
  await expect(rows(page)).toHaveCount(PAGE_SIZE);
});
