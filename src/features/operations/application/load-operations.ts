import { planejamento, viagens } from '@/features/operations/infrastructure/operations-api';
import type { FalhaPlanejamento, ViagemComCiclo } from '@/features/operations/domain/models';

export interface OperationsData {
  trips: ViagemComCiclo[];
  failures: FalhaPlanejamento[];
}

/**
 * Reservas ficam fora daqui: a aba tem paginação própria por cursor. Os nomes de
 * cliente e destino também saíram — a API já os devolve na listagem, então o
 * painel não precisa mais baixar as tabelas inteiras só para montar um mapa.
 */
export async function loadOperations(): Promise<OperationsData> {
  const [trips, failures] = await Promise.all([viagens.list(), planejamento.failures(100)]);
  return { trips, failures };
}
