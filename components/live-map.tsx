'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { RotaDinamica, ViagemLocalizacao } from '@/types/domain';

interface Props { location: ViagemLocalizacao | null; route: RotaDinamica | null }

export default function LiveMap({ location, route }: Props) {
  const routePoints: LatLngExpression[] = route?.rota.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) ?? [];
  const current: LatLngExpression | null = location ? [location.latitude, location.longitude] : null;
  const initial = current ?? routePoints[0] ?? [-9.65, -36.0];

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
