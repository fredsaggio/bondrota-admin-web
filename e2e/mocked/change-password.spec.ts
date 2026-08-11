import { expect, test } from '../support/fixtures';
import { mockApi, TEST_ADMIN } from '../support/api-mock';
import { changePasswordDialog, dashboardHeading, signIn } from '../support/actions';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await signIn(page, TEST_ADMIN);
});

test('troca a senha e mantem a sessao aberta', async ({ page }) => {
  const dialog = changePasswordDialog(page);
  await dialog.open.click();

  await dialog.atual.fill(TEST_ADMIN.senha);
  await dialog.nova.fill('senha-nova-123');
  await dialog.confirmacao.fill('senha-nova-123');
  await dialog.submit.click();

  await expect(dialog.success).toBeVisible();
});

/**
 * A regressao mais cara possivel neste fluxo: a API responde 403 para senha atual
 * errada justamente porque o painel encerra a sessao em qualquer 401. Se alguem
 * trocar esse status, quem errar a digitacao e expulso para o login no meio da troca.
 */
test('senha atual errada mostra o erro sem derrubar a sessao', async ({ page }) => {
  const dialog = changePasswordDialog(page);
  await dialog.open.click();

  await dialog.atual.fill('senha-que-nao-e-a-atual');
  await dialog.nova.fill('senha-nova-123');
  await dialog.confirmacao.fill('senha-nova-123');
  await dialog.submit.click();

  await expect(dialog.error).toContainText(/senha atual/i);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dashboardHeading(page)).toBeVisible();
});

test('confirmacao divergente e barrada antes de chamar a API', async ({ page }) => {
  const dialog = changePasswordDialog(page);
  await dialog.open.click();

  let called = false;
  await page.route('**/api/v1/admin/senha', async (route) => {
    called = true;
    await route.fulfill({ status: 204 });
  });

  await dialog.atual.fill(TEST_ADMIN.senha);
  await dialog.nova.fill('senha-nova-123');
  await dialog.confirmacao.fill('senha-nova-124');
  await dialog.submit.click();

  await expect(dialog.error).toContainText(/confirmação/i);
  expect(called, 'a validacao local deve evitar a ida ate a API').toBe(false);
});

test('senha nova curta demais e barrada', async ({ page }) => {
  const dialog = changePasswordDialog(page);
  await dialog.open.click();

  await dialog.atual.fill(TEST_ADMIN.senha);
  await dialog.nova.fill('curta');
  await dialog.confirmacao.fill('curta');
  await dialog.submit.click();

  // O minLength do input barra o envio antes do submit handler rodar; o dialog
  // continua aberto e nada e enviado.
  await expect(dialog.dialog).toBeVisible();
  await expect(dialog.success).toBeHidden();
});
