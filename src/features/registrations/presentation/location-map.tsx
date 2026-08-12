'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import type { AreaBounds } from '@/features/registrations/infrastructure/geocoding';

export interface Point { latitude: number; longitude: number }

interface Props {
  point: Point | null;
  /** Centro usado enquanto nenhum ponto foi escolhido. */
  center: LatLngExpression;
  /** Área para enquadrar quando o admin troca o município. */
  focus: AreaBounds | null;
  onPick(point: Point): void;
}

/**
 * Marcador desenhado em HTML em vez do ícone padrão do Leaflet, que depende de
 * PNGs resolvidos pelo bundler e costuma sair quebrado. `className: ''` remove
 * a caixa branca que o Leaflet aplica por padrão em `divIcon`.
 */
const pin = divIcon({
  className: '',
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#426fa8;border:3px solid #fff;box-shadow:0 1px 5px rgba(20,33,55,.5)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function LocationMap({ point, center, focus, onPick }: Props) {
  return (
    <MapContainer
      center={point ? [point.latitude, point.longitude] : center}
      zoom={point ? 16 : 13}
      className="h-64 w-full rounded-md"
      zoomControl
      // O mapa fica no meio de um formulário que rola dentro do modal. Com o
      // zoom por scroll ligado, o Leaflet engole a roda do mouse e quem tenta
      // descer até o botão de salvar acaba dando zoom. O zoom continua nos
      // botões +/- e no duplo clique.
      scrollWheelZoom={false}
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {point && (
        <Marker
          position={[point.latitude, point.longitude]}
          icon={pin}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = event.target.getLatLng();
              onPick({ latitude: lat, longitude: lng });
            },
          }}
        />
      )}
      <PickOnClick onPick={onPick} />
      <FocusArea focus={focus} />
      <FitToContainer />
    </MapContainer>
  );
}

function PickOnClick({ onPick }: { onPick(point: Point): void }) {
  useMapEvents({ click: (event) => onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return null;
}

/** Reenquadra quando o município muda, sem tocar no marcador já posicionado. */
function FocusArea({ focus }: { focus: AreaBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.fitBounds(focus, { padding: [24, 24] });
  }, [focus, map]);
  return null;
}

/**
 * O mapa nasce dentro de um modal recém-aberto. Sem recalcular o tamanho depois
 * que o layout assenta, o Leaflet mede o container cedo demais e desenha os
 * tiles cortados — o clássico mapa cinza pela metade.
 */
function FitToContainer() {
  const map = useMap();
  const container = useRef<HTMLElement | null>(null);

  useEffect(() => {
    map.invalidateSize();
    container.current = map.getContainer();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [map]);

  return null;
}
