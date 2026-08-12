/** Cantos sudoeste e nordeste, no formato que o Leaflet espera em `fitBounds`. */
export type AreaBounds = [[number, number], [number, number]];

export interface AddressResult {
  id: string;
  /** Endereço por extenso, como o Nominatim devolve. Distingue resultados homônimos. */
  label: string;
  /** Só o logradouro, para preencher o campo "Rua". Vazio quando o ponto não tem rua. */
  street: string;
  latitude: number;
  longitude: number;
  bounds: AreaBounds | null;
}

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Monta o logradouro a partir do endereço estruturado do Nominatim. Usamos
 * `addressdetails` em vez de recortar o `display_name`, que muda de formato
 * conforme o tipo de lugar e não daria para fatiar com segurança.
 */
function toStreet(address: unknown): string {
  if (!address || typeof address !== 'object') return '';
  const { road, house_number: houseNumber } = address as { road?: unknown; house_number?: unknown };
  if (typeof road !== 'string' || road === '') return '';
  return typeof houseNumber === 'string' && houseNumber !== '' ? `${road}, ${houseNumber}` : road;
}

/** Converte o `boundingbox` do Nominatim ([sul, norte, oeste, leste], em texto). */
function toBounds(raw: unknown): AreaBounds | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const [south, north, west, east] = raw.map(Number);
  if ([south, north, west, east].some((value) => !Number.isFinite(value))) return null;
  return [[south, west], [north, east]];
}

/**
 * Busca livre de endereço, para o admin chegar perto do ponto sem navegar o
 * mapa na mão. Restrita ao Brasil — diferente de `state`, `countrycodes` é
 * filtro de verdade no Nominatim, e corta o ruído de nomes repetidos mundo afora.
 *
 * Devolve vários resultados de propósito: uma mesma avenida costuma vir
 * quebrada em trechos por bairro, e escolher o primeiro cairia no lugar errado
 * com frequência.
 */
export async function searchAddress(term: string, signal?: AbortSignal): Promise<AddressResult[]> {
  const query = new URLSearchParams({
    q: term,
    countrycodes: 'br',
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
  });

  try {
    const response = await fetch(`${NOMINATIM_SEARCH}?${query}`, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return [];
    const results: unknown = await response.json();
    if (!Array.isArray(results)) return [];

    return results.flatMap((item, index) => {
      const row = item as { place_id?: unknown; display_name?: unknown; lat?: unknown; lon?: unknown; boundingbox?: unknown; address?: unknown };
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      return [{
        id: String(row.place_id ?? index),
        label: String(row.display_name ?? ''),
        street: toStreet(row.address),
        latitude,
        longitude,
        bounds: toBounds(row.boundingbox),
      }];
    });
  } catch {
    return [];
  }
}

/**
 * Descobre o logradouro de um ponto marcado no mapa, para poupar a digitação do
 * endereço. Devolve string vazia quando o ponto não tem rua conhecida (meio de
 * uma praça, área rural) — aí o campo simplesmente continua como estava.
 */
export async function reverseStreet(latitude: number, longitude: number, signal?: AbortSignal): Promise<string> {
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
  });

  try {
    const response = await fetch(`${NOMINATIM_REVERSE}?${query}`, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return '';
    const result: unknown = await response.json();
    return toStreet((result as { address?: unknown })?.address);
  } catch {
    return '';
  }
}

/**
 * Descobre a área de um município no Nominatim para enquadrar o mapa.
 *
 * Usa a busca estruturada (`city` + `state`) em vez de texto livre porque o
 * formulário já tem os dois campos separados — e há municípios homônimos em
 * estados diferentes, que uma busca por texto resolveria a esmo.
 *
 * Devolve `null` em qualquer falha: enquadrar o mapa é conveniência, então o
 * cadastro continua com o admin navegando na mão.
 */
export async function findMunicipioBounds(nome: string, uf: string, signal?: AbortSignal): Promise<AreaBounds | null> {
  const query = new URLSearchParams({
    city: nome,
    state: uf,
    country: 'Brazil',
    format: 'jsonv2',
    limit: '1',
  });

  try {
    const response = await fetch(`${NOMINATIM_SEARCH}?${query}`, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return null;
    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    return toBounds((results[0] as { boundingbox?: unknown }).boundingbox);
  } catch {
    return null;
  }
}
