import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const OLT_COLORS = { ONLINE: '#00D4FF', OFFLINE: '#6B7280', DEGRADED: '#FF6B35', MAINTENANCE: '#A855F7' };

function createOLTIcon(status) {
  const color = OLT_COLORS[status] || '#6B7280';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <rect x="2" y="6" width="16" height="10" rx="2" fill="${color}" opacity="0.9"/>
    <rect x="5" y="3" width="3" height="4" fill="${color}" opacity="0.7"/>
    <rect x="12" y="3" width="3" height="4" fill="${color}" opacity="0.7"/>
    <circle cx="7" cy="11" r="1.5" fill="#0A0E1A"/>
    <circle cx="13" cy="11" r="1.5" fill="#0A0E1A"/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

export default function OLTMap({ olts = [] }) {
  return (
    <>
      {olts.filter(o => o.latitude && o.longitude).map(olt => (
        <Marker
          key={olt.id}
          position={[olt.latitude, olt.longitude]}
          icon={createOLTIcon(olt.status)}
        >
          <Popup>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', minWidth: '140px' }}>
              <div style={{ fontWeight: 600, color: OLT_COLORS[olt.status] }}>{olt.name}</div>
              <div style={{ color: '#94A3B8', marginTop: '4px' }}>IP: {olt.ip}</div>
              <div style={{ color: '#64748B' }}>Estado: {olt.status}</div>
              {olt.location && <div style={{ color: '#64748B' }}>{olt.location}</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
