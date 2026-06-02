import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getMarkerColor(status, rxPower) {
  if (status === 'LOS' || status === 'DYING_GASP') return '#FF3B5C';
  if (status === 'OFFLINE') return '#6B7280';
  if (rxPower <= -25) return '#FF6B35';
  return '#00FF94';
}

export default function MapView() {
  const { data: onts = [] } = useQuery({
    queryKey: ['map-onts'],
    queryFn: () => api.get('/map/onts').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const center = onts.length > 0 ? [onts[0].latitude, onts[0].longitude] : [-34.6, -58.4];

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Mapa de Red</h1>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00FF94' }} />Online</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#FF6B35' }} />Débil</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#FF3B5C' }} />LOS/Offline</span>
        </div>
      </div>
      <div className="flex-1 rounded-lg overflow-hidden" style={{ border: '1px solid #1E2D45' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', background: '#0A0E1A' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {onts.map(ont => (
            <CircleMarker
              key={ont.id}
              center={[ont.latitude, ont.longitude]}
              radius={6}
              pathOptions={{ color: getMarkerColor(ont.status, ont.rx_power), fillColor: getMarkerColor(ont.status, ont.rx_power), fillOpacity: 0.8, weight: 1.5 }}
            >
              <Popup>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#E2E8F0', background: '#1A2235' }}>
                  <div><b>{ont.serial_number}</b></div>
                  <div>Estado: {ont.status}</div>
                  {ont.rx_power != null && <div>RX: {ont.rx_power} dBm</div>}
                  {ont.description && <div>{ont.description}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
