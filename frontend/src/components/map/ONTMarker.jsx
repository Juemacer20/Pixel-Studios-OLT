import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';

function getColor(status, rx) {
  if (status === 'LOS') return '#FF3B5C';
  if (status === 'OFFLINE') return '#6B7280';
  if (rx && rx <= -25) return '#FF6B35';
  return '#00FF94';
}

export default function ONTMarker({ ont }) {
  const color = getColor(ont.status, ont.rx_power);
  return (
    <CircleMarker center={[ont.latitude, ont.longitude]} radius={6}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1.5 }}>
      <Popup>
        <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          <b>{ont.serial_number}</b><br />
          Estado: {ont.status}<br />
          {ont.rx_power != null && `RX: ${ont.rx_power} dBm`}
        </div>
      </Popup>
    </CircleMarker>
  );
}
