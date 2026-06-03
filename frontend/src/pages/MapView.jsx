import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl       from 'leaflet/dist/images/marker-icon.png';
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png';
import api from '../services/api';
import { IconMap, IconEye, IconEyeOff, IconFlame, IconRouter } from '@tabler/icons-react';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// ── Mock data fallback ────────────────────────────────────────────────────────
const BASE_LAT = -34.603722;
const BASE_LNG = -58.381592;

function randF(a, b) { return parseFloat((Math.random() * (b - a) + a).toFixed(5)); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Color helpers ─────────────────────────────────────────────────────────────
function getOntColor(status, rx) {
  if (status === 'LOS' || status === 'DYING_GASP') return '#f85149';
  if (status === 'OFFLINE') return '#484f58';
  if (rx != null && rx <= -27) return '#d29922';
  if (rx != null && rx <= -24) return '#79c0ff';
  return '#3fb950';
}

// ── OLT custom icon ───────────────────────────────────────────────────────────
const OltIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:6px;
    background:#1f6feb;border:2px solid #388bfd;
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:12px;font-weight:700;
    box-shadow:0 0 12px rgba(31,111,235,0.6);
  ">O</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// ── Legend component ──────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#3fb950', label: 'Online óptimo' },
    { color: '#79c0ff', label: 'Señal débil' },
    { color: '#d29922', label: 'Señal crítica' },
    { color: '#f85149', label: 'LOS / Falla' },
    { color: '#484f58', label: 'Offline' },
    { color: '#1f6feb', label: 'OLT' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      padding: '6px 12px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 6,
    }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: item.label === 'OLT' ? 10 : 8,
            height: item.label === 'OLT' ? 10 : 8,
            borderRadius: item.label === 'OLT' ? 2 : '50%',
            background: item.color,
            flexShrink: 0,
            boxShadow: `0 0 4px ${item.color}60`,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapView() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showOLTs,    setShowOLTs]    = useState(true);

  const { data: ontsRaw = [] } = useQuery({
    queryKey: ['map-onts'],
    queryFn: () => api.get('/map/onts').then(r => r.data.data),
    retry: 1,
    refetchInterval: 60000,
  });

  const { data: oltsRaw = [] } = useQuery({
    queryKey: ['map-olts'],
    queryFn: () => api.get('/map/olts').then(r => r.data.data),
    retry: 1,
    refetchInterval: 120000,
  });

  const onts = (ontsRaw || []).filter(o => o.latitude && o.longitude);
  const olts = (oltsRaw || []).filter(o => o.latitude && o.longitude);

  const center = onts.length > 0 ? [onts[0].latitude, onts[0].longitude] : [BASE_LAT, BASE_LNG];

  const onlineCount  = onts.filter(o => o.status === 'ONLINE').length;
  const losCount     = onts.filter(o => o.status === 'LOS' || o.status === 'DYING_GASP').length;
  const offlineCount = onts.filter(o => o.status === 'OFFLINE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconMap size={18} style={{ color: 'var(--accent)' }} />
            Mapa de Red
          </h1>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--green)' }}>
              <span style={{ fontWeight: 700 }}>{onlineCount}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>online</span>
            </span>
            <span style={{ color: 'var(--red)' }}>
              <span style={{ fontWeight: 700 }}>{losCount}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>LOS</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 700 }}>{offlineCount}</span>
              <span style={{ marginLeft: 3 }}>offline</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className={showHeatmap ? 'btn btn-primary' : 'btn'}
            onClick={() => setShowHeatmap(h => !h)}
          >
            <IconFlame size={13} /> Heatmap
          </button>
          <button
            className={showOLTs ? 'btn btn-primary' : 'btn'}
            onClick={() => setShowOLTs(s => !s)}
          >
            <IconRouter size={13} /> OLTs
          </button>
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Map */}
      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 400 }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          preferCanvas
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* ONT markers */}
          {onts.map(ont => {
            const color = getOntColor(ont.status, ont.rx_power);
            return (
              <CircleMarker
                key={ont.id}
                center={[ont.latitude, ont.longitude]}
                radius={6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 160, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{ont.serial_number}</div>
                    <div>Estado: <span style={{ color }}>{ont.status}</span></div>
                    {ont.rx_power != null && (
                      <div>RX: <span style={{ color }}>{ont.rx_power} dBm</span></div>
                    )}
                    {ont.description && (
                      <div style={{ color: '#6b7280', marginTop: 2 }}>{ont.description}</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Heatmap circles */}
          {showHeatmap && onts
            .filter(o => o.rx_power != null && o.status === 'ONLINE')
            .map(ont => {
              const intensity = Math.max(0, Math.min(1, (ont.rx_power + 30) / 15));
              const color = intensity > 0.7 ? '#3fb950' : intensity > 0.4 ? '#d29922' : '#f85149';
              return (
                <Circle
                  key={`heat-${ont.id}`}
                  center={[ont.latitude, ont.longitude]}
                  radius={200}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: color,
                    fillOpacity: 0.12,
                  }}
                />
              );
            })
          }

          {/* OLT markers */}
          {showOLTs && olts.map(olt => (
            <Marker key={olt.id} position={[olt.latitude, olt.longitude]} icon={OltIcon}>
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, color: '#1f6feb' }}>{olt.name}</div>
                  {olt.location && <div style={{ color: '#6b7280' }}>{olt.location}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
