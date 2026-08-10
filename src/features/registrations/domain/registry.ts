import type { Cliente, Destino, Parada, RotaInterna } from '@/features/registrations/domain/models';

export type EntityKey = 'destinos' | 'paradas' | 'rotas' | 'horarios' | 'veiculos' | 'motoristas' | 'clientes' | 'vinculos' | 'admins';

export interface RegistryRecord {
  id: number;
  [key: string]: unknown;
}

export interface RegistryReferences {
  paradas: Parada[];
  destinos: Destino[];
  rotas: RotaInterna[];
  clientes: Cliente[];
}

export interface RegistryPageData {
  records: RegistryRecord[];
  references: RegistryReferences;
}
