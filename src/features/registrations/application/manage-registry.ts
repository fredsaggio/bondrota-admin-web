import { clientes, destinos, horarios, motoristas, municipios, paradas, rotasInternas, veiculos, vinculos } from '@/features/registrations/infrastructure/registrations-api';
import { ApiError } from '@/shared/infrastructure/http/api-client';
import type { CursorPage } from '@/shared/domain/pagination';
import type { EntityKey, RegistryReferences, RegistryRecord } from '@/features/registrations/domain/registry';

/**
 * Referências que o formulário de cada entidade consome. Só as listadas aqui são
 * buscadas, para que abas sem nenhum select dependente não paguem por elas.
 */
const requiredReferences: Record<EntityKey, ReadonlyArray<keyof RegistryReferences>> = {
  destinos: [],
  paradas: [],
  rotas: ['paradas'],
  horarios: [],
  veiculos: [],
  motoristas: [],
  clientes: [],
  // 'clientes' saiu daqui: o select virou um combobox que busca no servidor, em
  // vez de baixar a tabela inteira para montar as opções.
  vinculos: ['destinos', 'rotas'],
};

/**
 * Campo de município (código IBGE) que cada entidade guarda, e o nome derivado que
 * a tabela deve exibir no lugar do código cru.
 */
const MUNICIPIO_ID_FIELDS: Partial<Record<EntityKey, string>> = {
  destinos: 'municipio_id',
  horarios: 'municipio_destino_id',
  motoristas: 'municipio_trabalho_id',
};

/** Entidades cuja listagem é paginada pelo servidor. */
export const PAGINATED_ENTITIES: ReadonlySet<EntityKey> = new Set<EntityKey>(['clientes', 'vinculos']);

export async function loadRegistryReferences(entity: EntityKey): Promise<RegistryReferences> {
  const needed = requiredReferences[entity];
  const reference = <T>(key: keyof RegistryReferences, load: () => Promise<T[]>): Promise<T[]> =>
    needed.includes(key) ? load() : Promise.resolve([]);

  const [stopItems, destinationItems, routeItems] = await Promise.all([
    reference('paradas', paradas.list),
    reference('destinos', destinos.list),
    reference('rotas', rotasInternas.list),
  ]);

  return { paradas: stopItems, destinos: destinationItems, rotas: routeItems };
}

/**
 * Uma página de registros. As entidades não paginadas devolvem tudo numa página
 * só (`has_more: false`), então a tela tem um caminho único para as duas formas.
 */
export async function loadRegistryRecords(
  entity: EntityKey,
  params: { cursor?: string; busca?: string } = {},
): Promise<CursorPage<RegistryRecord>> {
  if (entity === 'clientes') {
    const page = await clientes.page({ cursor: params.cursor, q: params.busca });
    return { items: page.items.map((item) => ({ ...item })), next_cursor: page.next_cursor, has_more: page.has_more };
  }
  if (entity === 'vinculos') {
    const page = await vinculos.page({ cursor: params.cursor, q: params.busca });
    return { items: page.items.map((item) => ({ ...item })), next_cursor: page.next_cursor, has_more: page.has_more };
  }

  const records = await attachMunicipioNames(entity, await loadEntity(entity));
  return { items: records, has_more: false };
}

/** Busca só os códigos IBGE distintos usados nos registros exibidos, um por vez,
 * via `GET /municipios/{codigoIbge}` — funciona para qualquer UF, ao contrário de
 * `listByUF`, que exigiria assumir uma UF fixa. */
async function attachMunicipioNames(entity: EntityKey, records: RegistryRecord[]): Promise<RegistryRecord[]> {
  const field = MUNICIPIO_ID_FIELDS[entity];
  if (!field) return records;

  const ids = [...new Set(records.map((record) => record[field]).filter((id): id is number => typeof id === 'number'))];
  const nameById = new Map<number, string>();
  await Promise.all(ids.map(async (id) => {
    try {
      const municipio = await municipios.get(id);
      nameById.set(id, municipio.nome);
    } catch (error) {
      // Código não encontrado (404): mantém fora do mapa, o fallback abaixo mostra
      // o código cru em vez de esconder a informação. Outros erros (rede, 5xx)
      // seguem o mesmo caminho — a listagem não pode travar por causa disso.
      if (!(error instanceof ApiError) || error.status !== 404) {
        console.error('Falha ao resolver nome do município', id, error);
      }
    }
  }));

  return records.map((record) => {
    const id = record[field];
    const name = typeof id === 'number' ? (nameById.get(id) ?? `Município #${id}`) : null;
    return { ...record, [`${field}_nome`]: name };
  });
}

/** Clientes e vínculos ficam de fora: as listagens deles são paginadas e tratadas
 * antes daqui. O tipo garante isso — se alguém remover o desvio, o switch para de
 * compilar. */
async function loadEntity(entity: Exclude<EntityKey, 'clientes' | 'vinculos'>): Promise<RegistryRecord[]> {
  switch (entity) {
    case 'destinos': return (await destinos.list()).map((item) => ({ ...item }));
    case 'paradas': return (await paradas.list()).map((item) => ({ ...item }));
    case 'rotas': return (await rotasInternas.list()).map((item) => ({ ...item, paradas_resumo: item.paradas.sort((a, b) => a.ordem - b.ordem).map((stop) => stop.nome).join(' → ') }));
    case 'horarios': return (await horarios.list()).map((item) => ({ ...item }));
    case 'veiculos': return (await veiculos.list()).map((item) => ({ ...item, categoria_label: ({ executivo: 'Executivo', escolar: 'Escolar', carro_7_lugares: 'Carro 7 lugares' } as Record<string, string>)[item.categoria] }));
    case 'motoristas': return (await motoristas.list()).map((item) => ({ ...item }));
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
    case 'vinculos': return vinculos.remove(Number(record.cliente_id), record.id);
  }
}
