import { clientes, motoristas, veiculos } from '@/features/registrations/infrastructure/registrations-api';
import { planejamento, reservas, viagens } from '@/features/operations/infrastructure/operations-api';
import { config } from '@/shared/infrastructure/config/config-api';

export async function loadDashboard() {
  // Reservas e viagens vêm agregadas do servidor. Somar `.length` de uma listagem
  // daria o número errado agora que as duas são paginadas — e não escalava nem
  // antes, porque baixava a tabela inteira só para contar.
  const [tripSummary, vehicleItems, driverItems, clientItems, bookingSummary, failures, appConfig] = await Promise.all([
    viagens.summary(), veiculos.list(), motoristas.list(), clientes.list(), reservas.summary(), planejamento.failures(10), config.get(),
  ]);
  return { tripSummary, vehicleItems, driverItems, clientItems, bookingSummary, failures, timeZone: appConfig.fuso_horario };
}
