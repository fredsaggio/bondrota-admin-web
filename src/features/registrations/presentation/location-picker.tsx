'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { config } from '@/shared/infrastructure/config/config-api';
import { useDebouncedValue } from '@/shared/application/use-debounced-value';
import { findMunicipioBounds, reverseStreet, searchAddress, type AddressResult, type AreaBounds } from '@/features/registrations/infrastructure/geocoding';
import type { Point } from '@/features/registrations/presentation/location-map';

const LocationMap = dynamic(() => import('@/features/registrations/presentation/location-map'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

/** Último recurso quando o `/config` não responde: o país inteiro, e o admin navega. */
const BRAZIL_CENTER: [number, number] = [-14.24, -51.93];

interface Props {
  defaultLatitude: string;
  defaultLongitude: string;
  /** Município selecionado no formulário. Só destinos têm; paradas passam `null`. */
  municipio: { nome: string; uf: string } | null;
  /**
   * Recebe o logradouro do ponto escolhido. Só destinos passam — paradas não
   * têm campo de rua, e sem ouvinte nenhuma consulta de reverse é feita.
   */
  onAddress?(street: string): void;
}

/**
 * Escolha de coordenada por mapa, com os campos numéricos ainda editáveis para
 * quem já tem o valor na mão. Os inputs mantêm `name="latitude"`/`"longitude"`
 * porque `buildPayload` lê tudo do FormData por nome — assim o submit, a API e
 * o backend seguem sem saber que existe um mapa aqui.
 */
export function LocationPicker({ defaultLatitude, defaultLongitude, municipio, onAddress }: Props) {
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<AreaBounds | null>(null);

  // Guardado em ref para o handler enxergar sempre a versão atual, mesmo que o
  // react-leaflet tenha registrado o callback do clique em outro render.
  const addressListener = useRef(onAddress);
  useEffect(() => { addressListener.current = onAddress; }, [onAddress]);
  // Cancela o reverse anterior: cliques seguidos no mapa poderiam chegar fora
  // de ordem e gravar a rua do ponto antigo.
  const pendingReverse = useRef<AbortController | null>(null);

  // O `center` do MapContainer só vale na montagem, então o mapa só entra em
  // cena depois que sabemos para onde olhar — senão ele nasceria no lugar
  // errado e ficaria lá.
  useEffect(() => {
    let active = true;
    config.get()
      .then((value) => { if (active) setCenter([value.latitude_base, value.longitude_base]); })
      .catch(() => { if (active) setCenter(BRAZIL_CENTER); });
    return () => { active = false; };
  }, []);

  // Depende dos campos soltos, e não do objeto, para não refazer a busca a cada
  // render só porque o pai recriou o literal.
  const municipioNome = municipio?.nome ?? '';
  const municipioUF = municipio?.uf ?? '';
  useEffect(() => {
    if (!municipioNome || !municipioUF) return;
    const controller = new AbortController();
    void findMunicipioBounds(municipioNome, municipioUF, controller.signal)
      .then((bounds) => { if (bounds) setFocus(bounds); });
    return () => controller.abort();
  }, [municipioNome, municipioUF]);

  const point = toPoint(latitude, longitude);

  /**
   * Aplica um ponto vindo de interação com o mapa (clique, arrasto do marcador
   * ou escolha na busca). Digitar coordenada à mão não passa por aqui de
   * propósito: cada tecla viraria uma consulta de reverse.
   *
   * `street` já vem preenchido quando a origem é a busca, que consultou o
   * endereço junto; só o clique e o arrasto precisam do reverse.
   */
  const pick = (next: Point, street?: string) => {
    // Seis casas decimais ficam abaixo do metro; o valor cru do Leaflet enche o
    // campo de dígitos que não significam nada.
    setLatitude(next.latitude.toFixed(6));
    setLongitude(next.longitude.toFixed(6));

    if (!addressListener.current) return;
    pendingReverse.current?.abort();
    if (street !== undefined) {
      if (street) addressListener.current(street);
      return;
    }
    const controller = new AbortController();
    pendingReverse.current = controller;
    void reverseStreet(next.latitude, next.longitude, controller.signal)
      .then((found) => { if (found && !controller.signal.aborted) addressListener.current?.(found); });
  };

  const chooseAddress = (result: AddressResult) => {
    pick({ latitude: result.latitude, longitude: result.longitude }, result.street);
    // Enquadra pela área do resultado quando ela existe; um endereço exato traz
    // caixa minúscula, e o `fitBounds` já resolve o zoom sozinho.
    if (result.bounds) setFocus(result.bounds);
  };

  return (
    <div className="sm:col-span-2">
      <span className="field-label">Localização <b className="text-red-500">*</b></span>
      <AddressSearch onChoose={chooseAddress} />
      {center ? <LocationMap point={point} center={center} focus={focus} onPick={pick} /> : <MapPlaceholder />}
      <p className="mt-1.5 text-xs text-slate-500">
        Clique no mapa para marcar o ponto ou arraste o marcador. Se já tiver as coordenadas, dá para digitar abaixo.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <label>
          <span className="field-label">Latitude</span>
          <input
            className="field" name="latitude" type="number" step="any" inputMode="decimal"
            value={latitude} onChange={(event) => setLatitude(event.target.value)} required
          />
        </label>
        <label>
          <span className="field-label">Longitude</span>
          <input
            className="field" name="longitude" type="number" step="any" inputMode="decimal"
            value={longitude} onChange={(event) => setLongitude(event.target.value)} required
          />
        </label>
      </div>
    </div>
  );
}

/** Termo curto demais gera resultado inútil e gasta a cota do Nominatim à toa. */
const MIN_TERM = 3;

/**
 * Busca de endereço para chegar perto do ponto sem navegar o mapa na mão.
 *
 * O debounce é mais longo que o padrão do projeto porque aqui o destino é o
 * Nominatim público, que pede no máximo ~1 requisição por segundo — a busca do
 * município, por disparar num `<select>`, não tem esse problema.
 */
function AddressSearch({ onChoose }: { onChoose(result: AddressResult): void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const listId = useId();

  const debounced = useDebouncedValue(term, 600);
  const ready = debounced.trim().length >= MIN_TERM;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    // setTimeout tira o setState do corpo síncrono do efeito, mesma convenção
    // de useResource e MunicipioField.
    const timeout = window.setTimeout(() => {
      setSearching(true);
      void searchAddress(debounced.trim(), controller.signal)
        .then((values) => { if (!controller.signal.aborted) { setResults(values); setOpen(true); } })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [debounced, ready]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className="relative mb-2" ref={container}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="field !pl-9"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar endereço"
          autoComplete="off"
          placeholder="Buscar endereço para centralizar o mapa"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            // O formulário inteiro seria enviado; aqui Enter é só "buscar".
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </div>

      {/* Enquanto o termo é curto o resultado anterior fica em memória mas some
          da tela, em vez de precisar de um setState só para limpá-lo. */}
      {open && ready && (
        // Precisa passar de 1000: a lista cai por cima do mapa, e o Leaflet põe
        // os cantos de controle (`.leaflet-top`) exatamente nesse valor. Com
        // 1000 cravado dá empate, e aí decide a ordem no DOM — o mapa vem
        // depois, então os botões de zoom apareceriam por cima do texto.
        <ul id={listId} role="listbox" className="absolute z-[1100] mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#dfe5ed] bg-white shadow-lg">
          {searching && <li className="px-3 py-2 text-xs text-slate-400">Buscando...</li>}
          {!searching && results.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Nenhum endereço encontrado</li>}
          {!searching && results.map((result) => (
            <li key={result.id}>
              <button
                type="button" role="option" aria-selected={false}
                className="block w-full px-3 py-2 text-left text-xs leading-5 hover:bg-slate-50"
                onClick={() => { onChoose(result); setOpen(false); }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="grid h-64 w-full place-items-center rounded-md border border-[#dfe5ed] bg-slate-50 text-xs text-slate-500">
      <span className="spinner" />
    </div>
  );
}

/** Coordenada digitada só vira marcador quando está completa e dentro da faixa válida. */
function toPoint(latitude: string, longitude: string): Point | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}
