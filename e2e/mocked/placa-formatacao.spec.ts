import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import { signIn } from '../support/actions';

/**
 * A placa e guardada limpa: o hifen e so apresentacao. A coluna tem UNIQUE, e
 * aceitar "ABC-1234" e "ABC1234" cadastraria o mesmo carro duas vezes sem o
 * indice perceber.
 */

async function abrirFormulario(page: Page) {
  await mockApi(page, { authenticated: false });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  await page.getByRole('button', { name: 'Veículos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo veículo' }).click();
}

const placa = (page: Page) => page.locator('input[name="placa"]');

test('padrao antigo ganha hifen conforme digita', async ({ page }) => {
  await abrirFormulario(page);

  // Ate a quarta posicao ainda cabem os dois padroes, entao nao ha hifen.
  await placa(page).pressSequentially('abc1');
  await expect(placa(page)).toHaveValue('ABC1');

  // A quinta posicao decide: digito e padrao antigo.
  await placa(page).pressSequentially('234');
  await expect(placa(page)).toHaveValue('ABC-1234');
});

test('o hifen digitado pelo admin aparece na hora, sem esperar a 5a posicao', async ({ page }) => {
  await abrirFormulario(page);

  // O admin digita o hifen no lugar natural (logo apos as 3 letras) mesmo sem
  // o campo ainda saber se vai virar padrao antigo ou Mercosul. Bloquear essa
  // tecla seria mais estranho do que corrigir sozinho depois, se precisar.
  await placa(page).pressSequentially('abc-');
  await expect(placa(page)).toHaveValue('ABC-');

  await placa(page).pressSequentially('1234');
  await expect(placa(page)).toHaveValue('ABC-1234');
});

test('o hifen digitado cedo some sozinho se a placa vira mercosul', async ({ page }) => {
  await abrirFormulario(page);

  await placa(page).pressSequentially('abc-');
  await expect(placa(page)).toHaveValue('ABC-');

  // A 5a posicao (letra) revela Mercosul, que nao usa hifen.
  await placa(page).pressSequentially('1d23');
  await expect(placa(page)).toHaveValue('ABC1D23');
});

test('padrao mercosul nao recebe hifen', async ({ page }) => {
  await abrirFormulario(page);

  await placa(page).pressSequentially('abc1d23');

  await expect(placa(page)).toHaveValue('ABC1D23');
});

test('a mascara recusa caractere fora do padrao de cada posicao', async ({ page }) => {
  await abrirFormulario(page);

  // Digitos nas tres primeiras posicoes e letras onde so cabe numero somem.
  await placa(page).pressSequentially('1a2b3c');
  await expect(placa(page)).toHaveValue('ABC');

  await placa(page).pressSequentially('x9');
  await expect(placa(page)).toHaveValue('ABC9');
});

test('nao passa de sete caracteres uteis', async ({ page }) => {
  await abrirFormulario(page);

  await placa(page).pressSequentially('abc123456789');

  await expect(placa(page)).toHaveValue('ABC-1234');
});

test('a placa vai limpa para a API, sem o hifen da mascara', async ({ page }) => {
  await abrirFormulario(page);

  const enviados: string[] = [];
  await page.route('**/api/v1/veiculos/**', async (route) => {
    if (route.request().method() === 'POST') {
      enviados.push((route.request().postDataJSON() as { placa?: string })?.placa ?? '');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await placa(page).pressSequentially('abc1234');
  await page.locator('input[name="modelo"]').fill('Onibus Teste');
  await page.locator('select[name="categoria"]').selectOption('escolar');
  await page.getByRole('button', { name: 'Criar registro' }).click();

  await expect.poll(() => enviados).toEqual(['ABC1234']);
});
