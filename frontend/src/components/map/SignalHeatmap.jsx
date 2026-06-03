import React from 'react';
import { CircleMarker } from 'react-leaflet';

function getHeatColor(rx) {
  if (rx === null || rx === undefined) return null;
  if (rx <= -27) return { color: '#FF3B5C', opacity: 0.9, radius: 18 };
  if (rx <= -25) return { color: '#FF6B35', opacity: 0.7, radius: 14 };
  if (rx >= -8) return { color: '#A855F7', opacity: 0.7, radius: 14 };
  if (rx >= -22 && rx <= -12) return { color: '#00FF94', opacity: 0.5, radius: 10 };
  return { color: '#00D4FF', opacity: 0.4, radius: 8 };
}

export default function SignalHeatmap({ onts = [] }) {
  const withLocation = onts.filter(o => o.latitude && o.longitude && o.rx_power !== null);

  return (
    <>
      {withLocation.map(ont => {
        const heat = getHeatColor(ont.rx_power);
        if (!heat) return null;
        return (
          <CircleMarker
            key={`heat-${ont.id}`}
            center={[ont.latitude, ont.longitude]}
            radius={heat.radius}
            pathOptions={{
              color: 'transparent',
              fillColor: heat.color,
              fillOpacity: heat.opacity * 0.3,
              weight: 0,
            }}
          />
        );
      })}
    </>
  );
}
