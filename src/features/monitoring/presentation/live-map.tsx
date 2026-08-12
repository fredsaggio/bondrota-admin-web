'use client';

import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { config } from '@/shared/infrastructure/config/config-api';
import type { RotaDinamica, ViagemLocalizacao } from '@/features/operations/domain/models';

interface Props { location: ViagemLocalizacao | null; route: RotaDinamica | null }

/** Último recurso quando o `/config` não responde: o país inteiro, e o admin navega. */
const BRAZIL_CENTER: LatLngExpression = [-14.24, -51.93];

export default function LiveMap({ location, route }: Props) {
  const [baseCity, setBaseCity] = useState<LatLngExpression | null>(null);

  // O `center` do MapContainer só vale na montagem, então esperamos saber onde
  // fica a cidade base antes de desenhar. Sem viagem selecionada é ela que
  // enquadra o mapa — antes havia um ponto fixo de Alagoas no código, que
  // estaria errado em qualquer outra cidade atendida.
  useEffect(() => {
    let active = true;
    config.get()
      .then((value) => { if (active) setBaseCity([value.latitude_base, value.longitude_base]); })
      .catch(() => { if (active) setBaseCity(BRAZIL_CENTER); });
    return () => { active = false; };
  }, []);

  const routePoints: LatLngExpression[] = route?.rota.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) ?? [];
  const current: LatLngExpression | null = location ? [location.latitude, location.longitude] : null;

  if (!baseCity) return <div className="app-loader !min-h-full"><span className="spinner" /><span>Carregando mapa</span></div>;
  const initial = current ?? routePoints[0] ?? baseCity;

  return (
    <MapContainer center={initial} zoom={12} className="h-full w-full" zoomControl>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: '#426fa8', weight: 5, opacity: .85 }} />}
      {current && <CircleMarker center={current} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#16856b', fillOpacity: 1 }}><Popup>Posição mais recente do veículo</Popup></CircleMarker>}
      <MapViewport current={current} routePoints={routePoints} />
    </MapContainer>
  );
}

function MapViewport({ current, routePoints }: { current: LatLngExpression | null; routePoints: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (current) map.setView(current, Math.max(map.getZoom(), 14), { animate: true });
    else if (routePoints.length > 1) map.fitBounds(routePoints as LatLngBoundsExpression, { padding: [28, 28] });
  }, [current, map, routePoints]);
  return null;
}
