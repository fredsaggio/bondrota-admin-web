import { admins, clientes, destinos, horarios, motoristas, paradas, rotasInternas, veiculos, vinculos } from '@/features/registrations/infrastructure/registrations-api';
import type { EntityKey, RegistryPageData, RegistryRecord } from '@/features/registrations/domain/registry';

export async function loadRegistry(entity: EntityKey): Promise<RegistryPageData> {
  const [stopItems, destinationItems, routeItems, clientItems, records] = await Promise.all([
    paradas.list(), destinos.list(), rotasInternas.list(), clientes.list(), loadEntity(entity),
  ]);
  return { records, references: { paradas: stopItems, destinos: destinationItems, rotas: routeItems, clientes: clientItems } };
}

async function loadEntity(entity: EntityKey): Promise<RegistryRecord[]> {
  switch (entity) {
    case 'destinos': return (await destinos.list()).map((item) => ({ ...item }));
    case 'paradas': return (await paradas.list()).map((item) => ({ ...item }));
    case 'rotas': return (await rotasInternas.list()).map((item) => ({ ...item, paradas_resumo: item.paradas.sort((a, b) => a.ordem - b.ordem).map((stop) => stop.nome).join(' → ') }));
    case 'horarios': return (await horarios.list()).map((item) => ({ ...item }));
    case 'veiculos': return (await veiculos.list()).map((item) => ({ ...item, categoria_label: ({ executivo: 'Executivo', escolar: 'Escolar', carro_7_lugares: 'Carro 7 lugares' } as Record<string, string>)[item.categoria] }));
    case 'motoristas': return (await motoristas.list()).map((item) => ({ ...item }));
    case 'clientes': return (await clientes.list()).map((item) => ({ ...item }));
    case 'admins': return (await admins.list()).map((item) => ({ ...item }));
    case 'vinculos': {
      const clientItems = await clientes.list();
      const groups = await Promise.all(clientItems.map(async (client) => (await vinculos.list(client.id)).map((item) => ({ ...item, cliente_nome: client.nome }))));
      return groups.flat();
    }
  }
}

export async function saveRegistryRecord(entity: EntityKey, record: RegistryRecord | null, payload: Record<string, unknown>) {
  const id = record?.id;
  switch (entity) {
    case 'destinos': return id ? destinos.update(id, payload) : destinos.create(payload);
    case 'paradas': return id ? paradas.update(id, payload) : paradas.create(payload);
    case 'horarios': return id ? horarios.update(id, payload) : horarios.create(payload);
    case 'veiculos': return id ? veiculos.update(id, payload) : veiculos.create(payload);
    case 'motoristas': return id ? motoristas.update(id, payload) : motoristas.create(payload);
    case 'clientes': return id ? clientes.update(id, payload) : clientes.create(payload);
    case 'admins': return id ? admins.update(id, payload) : admins.create(payload);
    case 'rotas': {
      const stopIds = payload.parada_ids as number[];
      if (!stopIds.length) throw new Error('Adicione pelo menos uma parada à rota.');
      return id ? rotasInternas.update(id, stopIds) : rotasInternas.create(stopIds);
    }
    case 'vinculos': {
      const clienteId = Number(payload.cliente_id);
      const body = { ...payload };
      delete body.cliente_id;
      return id ? vinculos.update(clienteId, id, body) : vinculos.create(clienteId, body);
    }
  }
}

export function removeRegistryRecord(entity: EntityKey, record: RegistryRecord) {
  switch (entity) {
    case 'destinos': return destinos.remove(record.id);
    case 'paradas': return paradas.remove(record.id);
    case 'rotas': return rotasInternas.remove(record.id);
    case 'horarios': return horarios.remove(record.id);
    case 'veiculos': return veiculos.remove(record.id);
    case 'motoristas': return motoristas.remove(record.id);
    case 'clientes': return clientes.remove(record.id);
    case 'admins': return admins.remove(record.id);
    case 'vinculos': return vinculos.remove(Number(record.cliente_id), record.id);
  }
}
