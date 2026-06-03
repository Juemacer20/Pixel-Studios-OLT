import React from 'react';
import { IconSearch } from '@tabler/icons-react';

/**
 * SearchInput — text field with a leading magnifying-glass icon.
 *
 * @param {string}   value        - controlled value
 * @param {function} onChange     - called with the new string value (not the event)
 * @param {string}   placeholder  - input placeholder (default 'Buscar...')
 * @param {string}   width        - CSS width (default '240px')
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  width = '240px',
}) {
  return (
    <div style={{ position: 'relative', width, flexShrink: 0 }}>
      <span
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <IconSearch size={13} />
      </span>
      <input
        type="text"
        className="input-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 28, fontSize: 12 }}
      />
    </div>
  );
}
