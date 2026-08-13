import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import { signIn } from '../support/actions';

/**
 * Fotos e documentos tinham nome aleatorio numa pasta solta, e cada
 * reenvio deixava o arquivo antigo orfao no bucket (nunca era apagado). Agora
 * o caminho e fixo por slot: "{entidade}/{id}/foto.ext" — reenviar substitui
 * em vez de acumular. Como o id nao existe antes do registro ser criado, a
 * criacao envia para uma pasta de espera ("_novo/{uuid}/...") que o backend
 * organiza depois; a edicao ja sabe o id e envia direto pro caminho final.
 */

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function abrirCadastros(page: Page) {
  const mock = await mockApi(page, { authenticated: false, motoristas: [sampleMotorista()] });
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
  await page.goto('/dashboard/cadastros');
  return mock;
}

function sampleMotorista() {
  return {
    id: 42,
    nome: 'Motorista Existente',
    cpf: '12345678909',
    telefone: '82999990000',
    data_nasc: '1990-01-01',
    turno: 'MT',
    municipio_trabalho_id: 2611606,
    residencia: 'Campo Alegre',
    foto: 'motoristas/42/foto.jpg',
  };
}

test('criar motorista: a foto vai para uma pasta de espera, sem id ainda', async ({ page }) => {
  const mock = await abrirCadastros(page);
  await page.getByRole('button', { name: 'Motoristas', exact: true }).click();
  await page.getByRole('button', { name: 'Novo motorista' }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'selfie.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  });

  await expect.poll(() => mock.uploadRequests).toHaveLength(1);
  const caminho = mock.uploadRequests[0];
  // Nao sabemos o id ainda (o registro nao existe), entao cai numa pasta de
  // espera com nome de arquivo fixo — nao um nome aleatorio por upload.
  expect(caminho).toMatch(/^_novo\/[0-9a-f-]{36}\/foto\.png$/);
});

test('editar motorista: a foto vai direto pro caminho definitivo, porque o id já existe', async ({ page }) => {
  const mock = await abrirCadastros(page);
  await page.getByRole('button', { name: 'Motoristas', exact: true }).click();
  await page.getByRole('button', { name: 'Editar' }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'nova-foto.jpg',
    mimeType: 'image/jpeg',
    buffer: PNG_1X1,
  });

  await expect.poll(() => mock.uploadRequests).toHaveLength(1);
  expect(mock.uploadRequests[0]).toBe('motoristas/42/foto.jpg');
});

test('reenviar a foto na mesma sessão de criação usa a mesma pasta de espera', async ({ page }) => {
  const mock = await abrirCadastros(page);
  await page.getByRole('button', { name: 'Motoristas', exact: true }).click();
  await page.getByRole('button', { name: 'Novo motorista' }).click();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_1X1 });
  await expect.poll(() => mock.uploadRequests).toHaveLength(1);

  await input.setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG_1X1 });
  await expect.poll(() => mock.uploadRequests).toHaveLength(2);

  // Mesma pasta de espera nos dois envios: o segundo substitui o primeiro
  // (upsert) em vez de deixar o primeiro órfão no bucket.
  const pastas = mock.uploadRequests.map((caminho) => caminho.replace(/foto\.png$/, ''));
  expect(pastas[0]).toBe(pastas[1]);
});

test('cliente não tem foto e envia os dois documentos obrigatórios', async ({ page }) => {
  const mock = await abrirCadastros(page);
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();

  await expect(page.getByLabel('Foto', { exact: true })).toHaveCount(0);

  await page.getByLabel('Documento de identificação').setInputFiles({
    name: 'identidade.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  });
  await page.getByLabel('Comprovante de residência').setInputFiles({
    name: 'residencia.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 documento de teste'),
  });

  await expect.poll(() => mock.uploadRequests).toHaveLength(2);
  const [identidade, residencia] = mock.uploadRequests;
  const pastaIdentidade = identidade.match(/^_novo\/([0-9a-f-]{36})\/documento-identificacao\.png$/)?.[1];
  const pastaResidencia = residencia.match(/^_novo\/([0-9a-f-]{36})\/comprovante-residencia\.pdf$/)?.[1];
  expect(pastaIdentidade).toBeTruthy();
  expect(pastaResidencia).toBe(pastaIdentidade);
});
