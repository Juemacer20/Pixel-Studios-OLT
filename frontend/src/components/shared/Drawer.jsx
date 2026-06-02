import React, { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

export default function Drawer({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width, background: '#111827', borderLeft: '1px solid #1E2D45', animation: 'slide-in 0.25s ease-out' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1E2D45' }}>
          <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
            <IconX size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
