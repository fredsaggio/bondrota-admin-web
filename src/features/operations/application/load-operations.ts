import { clientes, destinos } from '@/features/registrations/infrastructure/registrations-api';
import { planejamento, reservas, viagens } from '@/features/operations/infrastructure/operations-api';
import type { FalhaPlanejamento, Reserva, ViagemComCiclo } from '@/features/operations/domain/models';

export interface OperationsData {
  bookings: Reserva[];
  trips: ViagemComCiclo[];
  failures: FalhaPlanejamento[];
  clientNames: Map<number, string>;
  destinationNames: Map<number, string>;
}

export async function loadOperations(): Promise<OperationsData> {
  const [bookings, trips, failures, clientItems, destinationItems] = await Promise.all([
    reservas.list(), viagens.list(), planejamento.failures(100), clientes.list(), destinos.list(),
  ]);
  return {
    bookings,
    trips,
    failures,
    clientNames: new Map(clientItems.map((item) => [item.id, item.nome])),
    destinationNames: new Map(destinationItems.map((item) => [item.id, item.nome])),
  };
}
