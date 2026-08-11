import { test as base } from '@playwright/test';

/**
 * CSS injetado antes de cada navegacao para zerar animacoes e transicoes.
 *
 * A tela de login flutua continuamente (`ticket-float`, 6s em loop), e o
 * Playwright so clica em elementos estaveis — sem isso o clique no botao
 * de entrar falha de forma intermitente, conforme a fase da animacao.
 *
 * Cobre qualquer animacao, inclusive as que nao respeitam
 * `prefers-reduced-motion` e as que forem adicionadas depois.
 */
const DISABLE_ANIMATIONS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
`;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((css: string) => {
      const inject = () => {
        const style = document.createElement('style');
        style.setAttribute('data-e2e', 'disable-animations');
        style.textContent = css;
        document.head.append(style);
      };
      if (document.head) inject();
      else document.addEventListener('DOMContentLoaded', inject, { once: true });
    }, DISABLE_ANIMATIONS);

    await use(page);
  },
});

export { expect } from '@playwright/test';
