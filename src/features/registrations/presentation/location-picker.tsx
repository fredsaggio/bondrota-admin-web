'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { config } from '@/shared/infrastructure/config/config-api';
import { findMunicipioBounds, type AreaBounds } from '@/features/registrations/infrastructure/geocoding';
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
}

/**
 * Escolha de coordenada por mapa, com os campos numéricos ainda editáveis para
 * quem já tem o valor na mão. Os inputs mantêm `name="latitude"`/`"longitude"`
 * porque `buildPayload` lê tudo do FormData por nome — assim o submit, a API e
 * o backend seguem sem saber que existe um mapa aqui.
 */
export function LocationPicker({ defaultLatitude, defaultLongitude, municipio }: Props) {
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<AreaBounds | null>(null);

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
  // Seis casas decimais ficam abaixo do metro; o valor cru do Leaflet enche o
  // campo de dígitos que não significam nada.
  const pick = (next: Point) => {
    setLatitude(next.latitude.toFixed(6));
    setLongitude(next.longitude.toFixed(6));
  };

  return (
    <div className="sm:col-span-2">
      <span className="field-label">Localização <b className="text-red-500">*</b></span>
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
