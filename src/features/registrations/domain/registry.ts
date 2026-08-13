import type { Destino, Parada, RotaInterna } from '@/features/registrations/domain/models';

export type EntityKey = 'destinos' | 'paradas' | 'rotas' | 'horarios' | 'veiculos' | 'motoristas' | 'clientes' | 'vinculos';

export interface RegistryRecord {
  id: string | number;
  [key: string]: unknown;
}

export interface RegistryReferences {
  paradas: Parada[];
  destinos: Destino[];
  rotas: RotaInterna[];
}

export interface RegistryPageData {
  records: RegistryRecord[];
  references: RegistryReferences;
}
