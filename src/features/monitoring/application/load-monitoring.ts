import { motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { viagens } from '@/features/operations/infrastructure/operations-api';
import { ApiError } from '@/shared/infrastructure/http/api-client';

export async function loadMonitoringOverview() {
  const [tripItems, driverItems, vehicleItems] = await Promise.all([viagens.list(), motoristas.list(), veiculos.list()]);
  return { tripItems, driverItems, vehicleItems };
}

export async function loadLiveTrip(viagemId: number | null) {
  if (!viagemId) return { location: null, route: null };
  const [location, route] = await Promise.all([
    viagens.location(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
    viagens.route(viagemId).catch((error) => error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)),
  ]);
  return { location, route };
}
