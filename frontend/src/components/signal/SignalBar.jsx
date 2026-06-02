import React from 'react';

export default function SignalBar({ value, min = -30, max = -5 }) {
  if (value === null || value === undefined) {
    return <div className="text-[10px] text-gray-600 font-mono">—</div>;
  }

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value <= -27 ? '#FF3B5C' : value <= -25 ? '#FF6B35' : value >= -8 ? '#A855F7' : value >= -22 ? '#00FF94' : '#00D4FF';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1E2D45' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] w-14 text-right" style={{ color }}>{value} dBm</span>
    </div>
  );
}
