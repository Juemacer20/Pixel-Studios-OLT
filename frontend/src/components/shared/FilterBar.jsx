import React, { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconFilter } from '@tabler/icons-react';

/**
 * FilterBar — contenedor colapsable para barras de filtros.
 *
 * @param {ReactNode} children      - controles de filtro
 * @param {function}  onApply       - clic en "Apply"
 * @param {function}  onReset       - clic en "Reset"
 * @param {boolean}   defaultOpen   - estado inicial (default true)
 * @param {string}    title         - etiqueta del toggle (default 'Filters')
 * @param {boolean}   hideActions   - oculta Apply/Reset
 */
export default function FilterBar({
  children,
  onApply,
  onReset,
  defaultOpen = true,
  title = 'Filters',
  hideActions = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ marginBottom: 12, padding: 0 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <IconFilter size={13} />
          {title}
        </span>
        {open
          ? <IconChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
          : <IconChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            {children}
            {!hideActions && (
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                {onReset && (
                  <button className="btn" onClick={onReset} style={{ fontSize: 12 }}>Reset</button>
                )}
                {onApply && (
                  <button className="btn btn-primary" onClick={onApply} style={{ fontSize: 12 }}>Apply</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
