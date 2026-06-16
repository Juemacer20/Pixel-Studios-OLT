import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconX } from '@tabler/icons-react';
import { oltAPI } from '../services/api';
import toast from 'react-hot-toast';

const SaveConfigContext = createContext(null);

function SaveConfigModal({ open, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await oltAPI.saveConfig();
      toast.success('Configuration saved to OLT');
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save configuration');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

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
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: 440, maxWidth: '92vw',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Save configuration
            </span>
            <button className="btn-icon" onClick={onClose} style={{ padding: 4 }}>
              <IconX size={14} />
            </button>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Do you want to save the current configuration to the OLT?
              This will apply all pending changes.
            </p>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 18px', borderTop: '1px solid var(--border)',
          }}>
            <button className="btn" onClick={onClose} disabled={busy}>
              No, cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                  Saving…
                </span>
              ) : 'Yes, save configuration'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function SaveConfigProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openSaveConfig  = useCallback(() => setOpen(true), []);
  const closeSaveConfig = useCallback(() => setOpen(false), []);

  return (
    <SaveConfigContext.Provider value={{ openSaveConfig }}>
      {children}
      <SaveConfigModal open={open} onClose={closeSaveConfig} />
    </SaveConfigContext.Provider>
  );
}

export function useSaveConfig() {
  const ctx = useContext(SaveConfigContext);
  if (!ctx) throw new Error('useSaveConfig must be used inside SaveConfigProvider');
  return ctx;
}
