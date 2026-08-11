import { clientes, motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { planejamento, reservas, viagens } from '@/features/operations/infrastructure/operations-api';
import { config } from '@/shared/infrastructure/config/config-api';

export async function loadDashboard() {
  const [tripItems, vehicleItems, driverItems, clientItems, bookingItems, failures, appConfig] = await Promise.all([
    viagens.list(), veiculos.list(), motoristas.list(), clientes.list(), reservas.list(), planejamento.failures(10), config.get(),
  ]);
  return { tripItems, vehicleItems, driverItems, clientItems, bookingItems, failures, timeZone: appConfig.fuso_horario };
}
