'use client';

import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

/** Live dispatch map (spec section 6): every active job + online technician. */

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#d9912c',
  ACCEPTED: '#0072ce',
  EN_ROUTE: '#0072ce',
  ARRIVED: '#0b1e3f',
  IN_PROGRESS: '#0b1e3f',
};

const jobIcon = (status: string) =>
  L.divIcon({
    className: '',
    html: `<div class="pin" style="background:${STATUS_COLOR[status] ?? '#0072ce'}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const techIcon = L.divIcon({
  className: '',
  html: '<div class="tech-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface MapJob {
  id: string;
  status: string;
  lat: number;
  lng: number;
  label: string;
  sub: string;
}

export interface MapTech {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub: string;
}

export default function DispatchMap({ jobs, techs }: { jobs: MapJob[]; techs: MapTech[] }) {
  // Meskel Square fallback when nothing is live
  const center: [number, number] = jobs.length
    ? [jobs[0].lat, jobs[0].lng]
    : techs.length
      ? [techs[0].lat, techs[0].lng]
      : [9.0108, 38.7613];
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: 420 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {techs.map((t) => (
          <Marker key={`t-${t.id}`} position={[t.lat, t.lng]} icon={techIcon}>
            <Popup>
              <strong>{t.label}</strong>
              <br />
              {t.sub}
            </Popup>
          </Marker>
        ))}
        {jobs.map((j) => (
          <Marker key={j.id} position={[j.lat, j.lng]} icon={jobIcon(j.status)}>
            <Popup>
              <strong>{j.label}</strong>
              <br />
              {j.sub}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="hint" style={{ marginTop: '0.5rem' }}>
        <span style={{ color: '#d9912c' }}>●</span> awaiting dispatch{' '}
        <span style={{ color: '#0072ce' }}>●</span> accepted / en route{' '}
        <span style={{ color: '#0b1e3f' }}>●</span> on site{' '}
        <span style={{ color: 'var(--teal)' }}>●</span> online technician
      </p>
    </div>
  );
}
