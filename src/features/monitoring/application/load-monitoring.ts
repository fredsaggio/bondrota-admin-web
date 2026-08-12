import { motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { viagens } from '@/features/operations/infrastructure/operations-api';
import { ApiError } from '@/shared/infrastructure/http/api-client';

/**
 * O monitoramento só acompanha viagens programadas ou em andamento, e pede as
 * mais próximas primeiro: com a ordem padrão da listagem (mais recente no topo),
 * as viagens de hoje ficariam atrás de todas as futuras já planejadas.
 */
export async function loadMonitoringOverview() {
  const [tripPage, driverItems, vehicleItems] = await Promise.all([
    viagens.list({ status: ['programada', 'em_andamento'], ordem: 'asc', limit: 100 }),
    motoristas.list(),
    veiculos.list(),
  ]);
  return { tripItems: tripPage.items, driverItems, vehicleItems };
}

export async function loadLiveTrip(viagemId: number | null) {
  if (!viagemId) return { location: null, route: null };
  const [location, route] = await Promise.all([
    viagens.location(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
    viagens.route(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
  ]);
  return { location, route };
}
