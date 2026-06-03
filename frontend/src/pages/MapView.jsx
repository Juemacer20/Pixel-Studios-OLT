import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import OLTMap from '../components/map/OLTMap';
import SignalHeatmap from '../components/map/SignalHeatmap';
import 'leaflet/dist/leaflet.css';

function getMarkerColor(status, rxPower) {
  if (status === 'LOS' || status === 'DYING_GASP') return '#FF3B5C';
  if (status === 'OFFLINE') return '#6B7280';
  if (rxPower !== null && rxPower <= -25) return '#FF6B35';
  return '#00FF94';
}

export default function MapView() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showOLTs, setShowOLTs] = useState(true);

  const { data: onts = [] } = useQuery({
    queryKey: ['map-onts'],
    queryFn: () => api.get('/map/onts').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: olts = [] } = useQuery({
    queryKey: ['map-olts'],
    queryFn: () => api.get('/map/olts').then(r => r.data.data),
    refetchInterval: 120000,
  });

  const validOnts = onts.filter(o => o.latitude && o.longitude);
  const center = validOnts.length > 0 ? [validOnts[0].latitude, validOnts[0].longitude] : [-34.6, -58.4];

  const onlineCount = validOnts.filter(o => o.status === 'ONLINE').length;
  const losCount = validOnts.filter(o => o.status === 'LOS').length;
  const offlineCount = validOnts.filter(o => o.status === 'OFFLINE').length;

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold text-gray-200">Mapa de Red</h1>
          <div className="flex gap-3 text-xs font-mono text-gray-500">
            <span style={{ color: '#00FF94' }}>{onlineCount} online</span>
            <span style={{ color: '#FF3B5C' }}>{losCount} LOS</span>
            <span style={{ color: '#6B7280' }}>{offlineCount} offline</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(h => !h)}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: showHeatmap ? '#00D4FF22' : '#1A2235', border: `1px solid ${showHeatmap ? '#00D4FF44' : '#1E2D45'}`, color: showHeatmap ? '#00D4FF' : '#6B7280' }}
          >
            Heatmap
          </button>
          <button
            onClick={() => setShowOLTs(s => !s)}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: showOLTs ? '#00D4FF22' : '#1A2235', border: `1px solid ${showOLTs ? '#00D4FF44' : '#1E2D45'}`, color: showOLTs ? '#00D4FF' : '#6B7280' }}
          >
            OLTs
          </button>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00FF94' }} />Online</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#FF6B35' }} />Débil</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#FF3B5C' }} />LOS</span>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-lg overflow-hidden" style={{ border: '1px solid #1E2D45', minHeight: '400px' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {showHeatmap && <SignalHeatmap onts={validOnts} />}

          {validOnts.map(ont => (
            <CircleMarker
              key={ont.id}
              center={[ont.latitude, ont.longitude]}
              radius={6}
              pathOptions={{
                color: getMarkerColor(ont.status, ont.rx_power),
                fillColor: getMarkerColor(ont.status, ont.rx_power),
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', minWidth: '140px' }}>
                  <div style={{ fontWeight: 600 }}>{ont.serial_number}</div>
                  <div style={{ color: '#94A3B8', marginTop: '4px' }}>Estado: {ont.status}</div>
                  {ont.rx_power != null && <div style={{ color: '#94A3B8' }}>RX: {ont.rx_power} dBm</div>}
                  {ont.description && <div style={{ color: '#64748B', marginTop: '2px' }}>{ont.description}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {showOLTs && <OLTMap olts={olts} />}
        </MapContainer>
      </div>
    </div>
  );
}
