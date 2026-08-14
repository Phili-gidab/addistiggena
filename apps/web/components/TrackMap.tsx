'use client';

import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

const customerIcon = L.divIcon({
  className: '',
  html: '<div class="pin"></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const techIcon = L.divIcon({
  className: '',
  html: '<div class="pin" style="background: var(--teal);"></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function TrackMap({
  booking,
  tech,
}: {
  booking: { lat: number; lng: number };
  tech: { lat: number; lng: number } | null;
}) {
  const center: [number, number] = tech
    ? [(booking.lat + tech.lat) / 2, (booking.lng + tech.lng) / 2]
    : [booking.lat, booking.lng];
  return (
    <div className="map-wrap" style={{ marginBottom: '1rem' }}>
      <MapContainer center={center} zoom={14} scrollWheelZoom style={{ height: 300 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[booking.lat, booking.lng]} icon={customerIcon} />
        {tech && <Marker position={[tech.lat, tech.lng]} icon={techIcon} />}
        {tech && (
          <Polyline
            positions={[
              [tech.lat, tech.lng],
              [booking.lat, booking.lng],
            ]}
            pathOptions={{ color: 'var(--teal)', dashArray: '6 8', weight: 3 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
