/** Cantos sudoeste e nordeste, no formato que o Leaflet espera em `fitBounds`. */
export type AreaBounds = [[number, number], [number, number]];

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

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

    // boundingbox vem como [sul, norte, oeste, leste], em strings.
    const raw = (results[0] as { boundingbox?: unknown }).boundingbox;
    if (!Array.isArray(raw) || raw.length !== 4) return null;
    const [south, north, west, east] = raw.map(Number);
    if ([south, north, west, east].some((value) => !Number.isFinite(value))) return null;

    return [[south, west], [north, east]];
  } catch {
    return null;
  }
}
