import React, { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

const SIZE_WIDTH = { sm: 380, md: 480, lg: 620, xl: 820 };

export default function SmartModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const width = SIZE_WIDTH[size] ?? SIZE_WIDTH.md;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 499, background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'fade-in 0.15s ease',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width, maxWidth: '94vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
            <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ padding: 4 }}>
              <IconX size={14} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {footer ?? (
              <button className="btn" onClick={onClose}>Close</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
