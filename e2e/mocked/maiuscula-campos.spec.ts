import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import { signIn } from '../support/actions';

/**
 * Nome e curso não têm normalização alguma até aqui: "joão da silva" e "JOÃO
 * DA SILVA" viravam dois valores diferentes no banco, atrapalhando busca e
 * relatório. Agora ambos são forçados para maiúsculo — no back, que é quem
 * garante isso de verdade, e ao vivo no campo, para o admin ver o valor que
 * vai ser salvo em vez de levar uma surpresa depois.
 */

async function abrirCadastros(page: Page) {
  await mockApi(page, { authenticated: false });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
}

test('nome do motorista vira maiúsculo ao digitar', async ({ page }) => {
  await abrirCadastros(page);
  await page.getByRole('button', { name: 'Motoristas', exact: true }).click();
  await page.getByRole('button', { name: 'Novo motorista' }).click();

  await page.locator('input[name="nome"]').pressSequentially('joão da silva');

  await expect(page.locator('input[name="nome"]')).toHaveValue('JOÃO DA SILVA');
});

test('nome do cliente vira maiúsculo ao digitar', async ({ page }) => {
  await abrirCadastros(page);
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();

  await page.locator('input[name="nome"]').pressSequentially('maria souza');

  await expect(page.locator('input[name="nome"]')).toHaveValue('MARIA SOUZA');
});

test('curso do vínculo vira maiúsculo e bloqueia números ao digitar', async ({ page }) => {
  await abrirCadastros(page);
  await page.getByRole('button', { name: 'Vínculos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo vínculo' }).click();

  await page.locator('input[name="curso"]').pressSequentially('técnico em ti 2');

  await expect(page.locator('input[name="curso"]')).toHaveValue('TÉCNICO EM TI ');
});

test('explica qual comprovante enviar conforme o tipo do vínculo', async ({ page }) => {
  await abrirCadastros(page);
  await page.getByRole('button', { name: 'Vínculos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo vínculo' }).click();

  await expect(page.getByText('Comprovante de matrícula ou vínculo acadêmico', { exact: true })).toBeVisible();
  await expect(page.getByText(/nome do aluno, curso e período\/semestre/)).toBeVisible();

  await page.getByLabel('Tipo').selectOption('estagio');

  await expect(page.getByText('Termo de Compromisso de Estágio (TCE)', { exact: true })).toBeVisible();
  await expect(page.getByText(/firmado pelo estudante, pela concedente e pela instituição de ensino/)).toBeVisible();
});
