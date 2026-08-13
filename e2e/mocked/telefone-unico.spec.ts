import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { makeClientes, mockApi, TEST_ADMIN } from '../support/api-mock';
import { signIn } from '../support/actions';

test.describe.configure({ mode: 'serial' });

const motorista = {
  id: 42,
  nome: 'Motorista Existente',
  cpf: '12345678909',
  telefone: '82999990000',
  data_nasc: '1990-01-01',
  turno: 'MT',
  municipio_trabalho_id: 2611606,
  foto: '',
};

async function abrirEdicao(page: Page, entidade: 'Clientes' | 'Motoristas') {
  await mockApi(page, { authenticated: false, clientes: makeClientes(1), motoristas: [motorista] });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  await page.getByRole('button', { name: entidade, exact: true }).click();
  await page.getByRole('button', { name: 'Editar' }).click();
}

for (const cadastro of [
  { entidade: 'Clientes' as const, endpoint: 'clientes' },
  { entidade: 'Motoristas' as const, endpoint: 'motoristas' },
]) {
  test(`${cadastro.entidade.toLowerCase()}: telefone duplicado mostra o motivo e mantém o formulário aberto`, async ({ page }) => {
    await abrirEdicao(page, cadastro.entidade);

    await page.route(`**/api/v1/${cadastro.endpoint}/**`, async (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 409,
          contentType: 'text/plain; charset=utf-8',
          body: 'Já existe outro cadastro com este telefone.\n',
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.locator('input[name="telefone"]').fill('(82) 98888-7777');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByText('Já existe outro cadastro com este telefone.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible();
  });
}
