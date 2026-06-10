import React, { useState } from 'react';

// 16 colores SmartOLT (Apéndice B.3 / §4.1.16) + custom hex.
const COLORS = [
  '#23a85a', '#2f80ed', '#e08a16', '#9b59b6',
  '#e74c3c', '#1abc9c', '#f39c12', '#3498db',
  '#2ecc71', '#e91e63', '#00bcd4', '#ff5722',
  '#607d8b', '#795548', '#673ab7', '#3f51b5',
];

export default function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} onClick={() => setOpen((o) => !o)}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: value, display: 'inline-block', border: '1px solid var(--border)' }} />
        Color
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 60, background: 'var(--panel-bg)',
          border: '1px solid var(--border)', borderRadius: 8, padding: 10, boxShadow: 'var(--panel-shadow)', minWidth: 180 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
            {COLORS.map((c) => (
              <button key={c} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer',
                border: c === value ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                onClick={() => { onChange(c); setOpen(false); }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <input className="input-base" style={{ fontSize: 11, fontFamily: 'monospace' }} placeholder="#RRGGBB"
              value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button className="btn" style={{ fontSize: 11 }} onClick={() => { if (custom) { onChange(custom); setOpen(false); } }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
