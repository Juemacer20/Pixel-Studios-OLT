import React, { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';

/**
 * ActionModal — modal de formulario declarativo para acciones de ONU.
 *
 * @param {boolean}  open
 * @param {function} onClose
 * @param {function} onConfirm   - recibe el objeto de valores del formulario
 * @param {string}   title
 * @param {Array}    fields      - [{ key, label, type, options, placeholder, default, required, help }]
 *                                 type: text | password | number | select | textarea | checkbox
 * @param {string}   confirmLabel
 * @param {string}   confirmColor - color del borde/texto del botón confirmar
 * @param {boolean}  loading
 * @param {ReactNode} children   - contenido extra (ej. resultado de una lectura)
 */
export default function ActionModal({
  open, onClose, onConfirm, title, fields = [], confirmLabel = 'Confirm',
  confirmColor = 'var(--accent)', loading = false, children,
}) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      for (const f of fields) init[f.key] = f.default ?? (f.type === 'checkbox' ? false : '');
      setValues(init);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const missingRequired = fields.some((f) => f.required && (values[f.key] === '' || values[f.key] == null));

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'rgba(0,0,0,0.65)', animation: 'fade-in 0.15s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div role="dialog" aria-modal="true" style={{ width: 460, maxWidth: '92vw', maxHeight: '88vh',
        overflowY: 'auto', background: 'var(--sidebar-bg)', border: '1px solid var(--border-light)',
        borderRadius: 8, boxShadow: '0 16px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <button className="btn-icon" onClick={onClose} disabled={loading} aria-label="Close" style={{ padding: 4 }}>
            <IconX size={14} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (!missingRequired) onConfirm(values); }}
          style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {fields.map((f) => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {f.type !== 'checkbox' && <span>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</span>}
              {f.type === 'select' ? (
                <select className="input-base" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">—</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea className="input-base" rows={3} value={values[f.key] ?? ''} placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === 'checkbox' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
                  {f.label}
                </span>
              ) : (
                <input className="input-base" type={f.type || 'text'} value={values[f.key] ?? ''} placeholder={f.placeholder}
                  onChange={(e) => set(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
              )}
              {f.help && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.help}</span>}
            </label>
          ))}

          {children}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Close</button>
            <button type="submit" className="btn" disabled={loading || missingRequired}
              style={{ borderColor: confirmColor, color: confirmColor, opacity: loading || missingRequired ? 0.6 : 1 }}>
              {loading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="spinner" style={{ width: 12, height: 12 }} />Processing…</span> : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
