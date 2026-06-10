import React, { useState } from 'react';
import { IconArrowUp, IconX } from '@tabler/icons-react';

const DISMISSED_KEY = 'pso_update_dismissed';
const CURRENT = 'v3.3.0';
const LATEST = 'v3.53.0'; // objetivo SmartOLT

export default function UpdateBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(DISMISSED_KEY) && LATEST !== CURRENT);
  if (!visible) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(43,127,212,0.15), rgba(43,127,212,0.05))',
      borderBottom: '1px solid rgba(43,127,212,0.2)', padding: '7px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, color: '#7fb6ec',
    }}>
      <IconArrowUp size={14} />
      <span>Nueva versión disponible: <b>{LATEST}</b> (actual {CURRENT}).</span>
      <button className="btn-icon" style={{ marginLeft: 'auto', padding: 3 }}
        onClick={() => { setVisible(false); localStorage.setItem(DISMISSED_KEY, '1'); }}>
        <IconX size={13} />
      </button>
    </div>
  );
}
