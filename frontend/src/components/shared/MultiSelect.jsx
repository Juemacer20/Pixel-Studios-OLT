import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IconChevronDown, IconX } from '@tabler/icons-react';

/**
 * MultiSelect — dropdown con búsqueda y selección múltiple.
 *
 * @param {Object[]} options      - [{ value, label }]
 * @param {any[]}    value        - valores seleccionados
 * @param {function} onChange     - (selected: any[]) => void
 * @param {string}   placeholder
 * @param {boolean}  searchable   - habilita búsqueda interna (default true)
 * @param {number}   maxHeight    - altura máx del dropdown (default 220)
 * @param {string}   className
 */
export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  searchable = true,
  maxHeight = 220,
  className = '',
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const containerRef        = useRef(null);
  const searchRef           = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
    if (!open) setSearch('');
  }, [open, searchable]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, search]);

  const toggle    = (val) => {
    if (value.includes(val)) onChange(value.filter(v => v !== val));
    else onChange([...value, val]);
  };
  const selectAll = () => onChange(options.map(o => o.value));
  const clearAll  = () => onChange([]);

  const selectedLabels = options
    .filter(o => value.includes(o.value))
    .map(o => o.label);

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', minWidth: 120 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4,
          background: 'var(--content-bg)', cursor: 'pointer', minHeight: 30, gap: 4,
          fontSize: 12, color: value.length ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, flex: 1, overflow: 'hidden' }}>
          {value.length === 0 && <span>{placeholder}</span>}
          {value.length > 0 && value.length <= 2 && selectedLabels.map((lbl, i) => (
            <span key={i} style={{
              background: 'var(--primary)', color: '#fff',
              borderRadius: 3, padding: '0 5px', fontSize: 11,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              {lbl}
              <IconX size={9} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggle(value[i]); }} />
            </span>
          ))}
          {value.length > 2 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value.length} selected</span>
          )}
        </div>
        <IconChevronDown size={13} style={{
          flexShrink: 0, color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 600,
          background: 'var(--sidebar-bg)', border: '1px solid var(--border-light)',
          borderRadius: 4, boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          marginTop: 2, overflow: 'hidden',
        }}>
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="input-base"
                style={{ padding: '3px 7px', fontSize: 12 }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={selectAll} className="btn" style={{ fontSize: 11, padding: '1px 6px' }}>All</button>
            <button onClick={clearAll}  className="btn" style={{ fontSize: 11, padding: '1px 6px' }}>Clear</button>
          </div>

          <div style={{ maxHeight, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>No options</div>
            ) : filtered.map(opt => {
              const selected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: selected ? 'var(--primary)' : 'var(--text-primary)',
                    background: selected ? 'rgba(0,122,255,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <input type="checkbox" checked={selected} readOnly style={{ flexShrink: 0 }} />
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
