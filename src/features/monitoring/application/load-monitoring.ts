import { motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { viagens } from '@/features/operations/infrastructure/operations-api';
import { ApiError } from '@/shared/infrastructure/http/api-client';

/**
 * Página de viagens acompanháveis. Só programadas ou em andamento, e as mais
 * próximas primeiro: com a ordem padrão da listagem (mais recente no topo), as
 * viagens de hoje ficariam atrás de todas as futuras já planejadas.
 */
export function loadMonitoringTrips(cursor?: string) {
  return viagens.list({ status: ['programada', 'em_andamento'], ordem: 'asc', cursor });
}

/** Motoristas e veículos são tabelas pequenas e servem só para resolver nomes. */
export async function loadMonitoringReferences() {
  const [driverItems, vehicleItems] = await Promise.all([motoristas.list(), veiculos.list()]);
  return { driverItems, vehicleItems };
}

export async function loadLiveTrip(viagemId: number | null) {
  if (!viagemId) return { location: null, route: null };
  const [location, route] = await Promise.all([
    viagens.location(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
    viagens.route(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
  ]);
  return { location, route };
}
