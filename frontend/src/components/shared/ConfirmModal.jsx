import React, { useEffect } from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

const VARIANT_BTN = {
  danger:  'btn btn-danger',
  warning: 'btn btn-warning',
  info:    'btn btn-success',
  default: 'btn btn-primary',
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  danger = false,
  loading = false,
}) {
  const resolvedVariant = danger ? 'danger' : variant;
  const btnCls = VARIANT_BTN[resolvedVariant] ?? VARIANT_BTN.default;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', animation: 'fade-in 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          width: 420, maxWidth: '90vw',
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {resolvedVariant === 'danger' && (
              <IconAlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
            )}
            <span id="confirm-modal-title" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading} aria-label="Close" style={{ padding: 4 }}>
            <IconX size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 18px', minHeight: 48 }}>
          {message && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 18px', borderTop: '1px solid var(--border)',
        }}>
          <button className="btn" onClick={onClose} disabled={loading}>Close</button>
          <button
            className={btnCls}
            onClick={onConfirm}
            disabled={loading}
            style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="spinner" style={{ width: 12, height: 12 }} />
                Processing…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
