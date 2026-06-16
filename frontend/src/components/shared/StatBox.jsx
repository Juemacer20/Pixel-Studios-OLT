import React from 'react';
import { NavLink } from 'react-router-dom';

const COLOR_MAP = {
  blue:   { bg: 'var(--sol-blue)',   bgHover: 'var(--sol-blue2)' },
  green:  { bg: 'var(--sol-green)',  bgHover: 'var(--sol-green2)' },
  slate:  { bg: 'var(--sol-slate)',  bgHover: 'var(--sol-slate2)' },
  orange: { bg: 'var(--sol-orange)', bgHover: 'var(--sol-orange2)' },
};

/**
 * StatBox — KPI box cliqueable al estilo SmartOLT.
 *
 * @param {string}        to      - ruta de navegación
 * @param {string}        color   - 'blue' | 'green' | 'slate' | 'orange'
 * @param {ReactNode}     icon    - ícono Tabler
 * @param {string|number} value   - número principal
 * @param {string}        label   - etiqueta
 * @param {string[]}      footer  - líneas de desglose opcionales
 */
export default function StatBox({ to, color = 'blue', icon, value, label, footer }) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <NavLink
      to={to}
      className="sol-statbox"
      style={{ background: colors.bg, textDecoration: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.background = colors.bgHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = colors.bg; }}
    >
      <span className="ico" style={{ opacity: 0.85 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
          {value ?? '—'}
        </div>
        <div className="lbl" style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
          {label}
        </div>
      </div>
      {footer?.length > 0 && (
        <div className="foot" style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4,
          fontSize: 10.5, color: 'rgba(255,255,255,0.75)',
        }}>
          {footer.map((f, i) => <span key={i}>{f}</span>)}
        </div>
      )}
    </NavLink>
  );
}
