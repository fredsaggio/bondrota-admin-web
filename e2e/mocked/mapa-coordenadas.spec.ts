import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import { signIn } from '../support/actions';

/**
 * O cadastro de destinos e paradas pedia latitude e longitude digitadas, o que
 * obrigava o admin a sair do painel para descobrir a coordenada. Agora um mapa
 * marca o ponto; os campos continuam editaveis para quem ja tem o valor.
 */

async function abrirFormulario(page: Page, aba: string, botaoNovo: string) {
  await mockApi(page, { authenticated: false });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  await page.getByRole('button', { name: aba, exact: true }).click();
  await page.getByRole('button', { name: botaoNovo }).click();
}

const mapa = (page: Page) => page.locator('.leaflet-container');
const latitude = (page: Page) => page.locator('input[name="latitude"]');
const longitude = (page: Page) => page.locator('input[name="longitude"]');
const buscaEndereco = (page: Page) => page.getByRole('combobox', { name: 'Buscar endereço' });
/** Escopado no listbox: os `<select>` de UF e municipio tambem expoem `option`. */
const resultados = (page: Page) => page.locator('[role="listbox"]').getByRole('option');

test('o formulario de destino mostra o mapa no lugar das coordenadas cruas', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');

  await expect(mapa(page)).toBeVisible();
  // Os campos seguem no formulario, e vazios, para o clique preenche-los.
  await expect(latitude(page)).toHaveValue('');
  await expect(longitude(page)).toHaveValue('');
});

test('clicar no mapa preenche latitude e longitude', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  await mapa(page).click({ position: { x: 180, y: 120 } });

  // O valor exato depende do enquadramento; o que importa e que o clique virou
  // coordenada valida nos campos que o submit envia.
  await expect(latitude(page)).not.toHaveValue('');
  await expect(longitude(page)).not.toHaveValue('');
  expect(Number(await latitude(page).inputValue())).toBeGreaterThanOrEqual(-90);
  expect(Number(await latitude(page).inputValue())).toBeLessThanOrEqual(90);
  expect(Number(await longitude(page).inputValue())).toBeGreaterThanOrEqual(-180);
  expect(Number(await longitude(page).inputValue())).toBeLessThanOrEqual(180);
});

test('digitar a coordenada continua funcionando e coloca o marcador no mapa', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  await latitude(page).fill('-9.7817');
  await longitude(page).fill('-36.3506');

  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
});

test('escolher o municipio reenquadra o mapa pela area devolvida no geocoding', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  // Registrado depois do mockApi de proposito: o Playwright dá precedencia ao
  // handler mais recente, entao este substitui o stub padrao e grava a query.
  const geocoding: string[] = [];
  await page.route(/nominatim\.openstreetmap\.org/, async (route) => {
    geocoding.push(new URL(route.request().url()).search);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ boundingbox: ['-9.8820000', '-9.6354476', '-36.7544638', '-36.5410000'] }]),
    });
  });

  await page.locator('select[name="municipio_id"]').selectOption({ label: 'Arapiraca' });

  // Busca estruturada (city + state), e nao texto livre: ha municipios
  // homonimos em estados diferentes.
  await expect.poll(() => geocoding.length).toBe(1);
  expect(geocoding[0]).toContain('city=Arapiraca');
  expect(geocoding[0]).toContain('state=AL');
});

test('buscar endereco lista os resultados e escolher um marca o ponto', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  await buscaEndereco(page).fill('Avenida Fernandes Lima');

  // A mesma avenida vem quebrada em trechos por bairro; a lista existe para o
  // admin escolher qual, em vez de o painel adivinhar.
  await expect(resultados(page)).toHaveCount(2);
  await expect(resultados(page).first()).toContainText('Gruta de Lourdes');

  await resultados(page).nth(1).click();

  await expect(latitude(page)).toHaveValue('-9.635456');
  await expect(longitude(page)).toHaveValue('-35.736284');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
});

test('a lista de resultados fica acima do mapa, nao atras dele', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  await buscaEndereco(page).fill('Avenida Fernandes Lima');
  await expect(resultados(page).first()).toBeVisible();

  // A lista cai por cima do mapa, e as camadas do Leaflet vao de 400 (tiles) a
  // 800 (controles de zoom). `toBeVisible` nao detecta oclusao, entao sondamos
  // exatamente onde a lista e os controles de zoom se sobrepoem — chutar pontos
  // nao serve, porque passar ao lado do controle faz o teste passar a toa.
  const conflito = await page.locator('[role="listbox"]').evaluate((node) => {
    const lista = node.getBoundingClientRect();
    const controle = document.querySelector('.leaflet-control-zoom')?.getBoundingClientRect();
    if (!controle) return { sobrepoe: false, cobertoPor: null as string | null };

    const x = Math.max(lista.left, controle.left) + Math.min(lista.right, controle.right);
    const y = Math.max(lista.top, controle.top) + Math.min(lista.bottom, controle.bottom);
    const sobrepoe = lista.left < controle.right && lista.right > controle.left
      && lista.top < controle.bottom && lista.bottom > controle.top;
    if (!sobrepoe) return { sobrepoe: false, cobertoPor: null };

    const topo = document.elementFromPoint(x / 2, y / 2) as HTMLElement | null;
    return {
      sobrepoe: true,
      cobertoPor: node.contains(topo) ? null : (topo?.className?.toString().slice(0, 40) ?? '?'),
    };
  });

  // Se nao houver sobreposicao o teste nao esta medindo nada, e precisa saber disso.
  expect(conflito.sobrepoe).toBe(true);
  expect(conflito.cobertoPor).toBeNull();
});

test('a busca aguarda o debounce em vez de consultar a cada tecla', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  const buscas: string[] = [];
  await page.route(/nominatim\.openstreetmap\.org/, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('q')) buscas.push(url.searchParams.get('q') ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Digita rapido: sem debounce sairia uma requisicao por caractere, e o
  // Nominatim publico aceita cerca de uma por segundo.
  await buscaEndereco(page).pressSequentially('Maceio', { delay: 40 });
  await expect.poll(() => buscas.length, { timeout: 5000 }).toBe(1);
  expect(buscas[0]).toBe('Maceio');
});

test('termo curto demais nao consulta o Nominatim', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  const buscas: string[] = [];
  await page.route(/nominatim\.openstreetmap\.org/, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('q')) buscas.push(url.searchParams.get('q') ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await buscaEndereco(page).fill('Ma');
  await page.waitForTimeout(1200);

  expect(buscas).toEqual([]);
  await expect(resultados(page)).toHaveCount(0);
});

test('rolar com o cursor sobre o mapa rola o formulario, em vez de dar zoom', async ({ page }) => {
  await abrirFormulario(page, 'Destinos', 'Novo destino');
  await expect(mapa(page)).toBeVisible();

  // O mapa deixou o formulario mais alto que o modal, entao e preciso rolar ate
  // o botao de salvar. Com o zoom por scroll ligado o Leaflet engole a roda do
  // mouse e a rolagem simplesmente nao acontece.
  const scroller = page.locator('section[role="dialog"] > div.overflow-y-auto');
  await expect.poll(() => scroller.evaluate((node) => node.scrollTop)).toBe(0);

  await mapa(page).hover();
  await page.mouse.wheel(0, 400);

  await expect.poll(() => scroller.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});

test('parada tambem escolhe por mapa, sem seletor de municipio', async ({ page }) => {
  await abrirFormulario(page, 'Paradas', 'Nova parada');

  await expect(mapa(page)).toBeVisible();
  // Parada e ponto de embarque dentro da cidade base; nao ha municipio a pedir.
  await expect(page.locator('select[name="municipio_id"]')).toHaveCount(0);

  await mapa(page).click({ position: { x: 200, y: 140 } });
  await expect(latitude(page)).not.toHaveValue('');
});
