import { clientes, motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { planejamento, reservas, viagens } from '@/features/operations/infrastructure/operations-api';

export async function loadDashboard() {
  const [tripItems, vehicleItems, driverItems, clientItems, bookingItems, failures] = await Promise.all([
    viagens.list(), veiculos.list(), motoristas.list(), clientes.list(), reservas.list(), planejamento.failures(10),
  ]);
  return { tripItems, vehicleItems, driverItems, clientItems, bookingItems, failures };
}
