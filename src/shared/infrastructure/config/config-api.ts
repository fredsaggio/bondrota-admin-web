import { api } from '@/shared/infrastructure/http/api-client';
import type { AppConfig } from '@/shared/domain/transport';

let pending: Promise<AppConfig> | null = null;

export const config = {
  /**
   * A configuração é imutável dentro de um deploy (cidade base, coordenadas e
   * fuso vêm do ambiente da API), então a primeira chamada é reaproveitada por
   * todo mundo. Sem isso cada tela que precisa do fuso ou do centro do mapa
   * abriria uma requisição própria para o mesmo JSON.
   */
  get: () => {
    // Uma falha não fica em cache: limpamos a referência para que a próxima
    // chamada tente de novo, em vez de repetir o erro pelo resto da sessão.
    pending ??= api<AppConfig>('/config', { auth: false }).catch((reason: unknown) => {
      pending = null;
      throw reason;
    });
    return pending;
  },
};
