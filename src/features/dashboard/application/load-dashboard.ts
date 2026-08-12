import { clientes, motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { planejamento, reservas, viagens } from '@/features/operations/infrastructure/operations-api';
import { config } from '@/shared/infrastructure/config/config-api';

export async function loadDashboard() {
  // As contagens de reserva vêm agregadas do servidor. Somar `.length` de uma
  // listagem daria o número errado agora que `/reservas/` é paginada — e não
  // escalava nem antes, porque baixava a tabela inteira só para contar.
  const [tripItems, vehicleItems, driverItems, clientItems, bookingSummary, failures, appConfig] = await Promise.all([
    viagens.list(), veiculos.list(), motoristas.list(), clientes.list(), reservas.summary(), planejamento.failures(10), config.get(),
  ]);
  return { tripItems, vehicleItems, driverItems, clientItems, bookingSummary, failures, timeZone: appConfig.fuso_horario };
}
