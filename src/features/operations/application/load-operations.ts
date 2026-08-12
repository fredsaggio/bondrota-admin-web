import { planejamento } from '@/features/operations/infrastructure/operations-api';
import type { FalhaPlanejamento } from '@/features/operations/domain/models';

export interface OperationsData {
  failures: FalhaPlanejamento[];
}

/**
 * Só as falhas do planejamento: reservas e viagens têm paginação própria por
 * cursor. As falhas já vinham limitadas a 100 pelo próprio endpoint, então não
 * carregam o mesmo risco de crescer sem teto.
 */
export async function loadOperations(): Promise<OperationsData> {
  const failures = await planejamento.failures(100);
  return { failures };
}
