import React from 'react';
export default function TR069Stats({ devices = [] }) {
  const online = devices.filter(d => d.last_inform && Date.now() - new Date(d.last_inform) < 300000).length;
  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      {[['Total', devices.length, '#00D4FF'], ['Online', online, '#00FF94'], ['Offline', devices.length - online, '#FF3B5C']].map(([l, v, c]) => (
        <div key={l} className="rounded p-3 text-center" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
          <div className="text-2xl font-bold" style={{ color: c }}>{v}</div>
          <div className="text-gray-500 mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
}
