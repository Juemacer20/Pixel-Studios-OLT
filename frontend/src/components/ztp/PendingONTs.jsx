import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ztpAPI } from '../../services/api';
import { useONTStore } from '../../store/ontStore';
import { IconWifi } from '@tabler/icons-react';

export default function PendingONTs({ onAuthorize }) {
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['ztp-pending'],
    queryFn: () => ztpAPI.pending().then(r => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-xs text-gray-600 py-4 text-center">Cargando...</div>;
  if (!pending.length) return <div className="text-xs text-gray-600 py-4 text-center">Sin ONTs pendientes</div>;

  return (
    <div className="flex flex-col gap-2">
      {pending.map(ont => (
        <div key={ont.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
          <IconWifi size={14} style={{ color: '#FF6B35' }} className="animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-gray-200">{ont.serial_number}</div>
            <div className="text-[10px] text-gray-500">{ont.olt?.name} — PON {ont.ponPort?.port_number ?? '?'}</div>
          </div>
          <button onClick={() => onAuthorize?.(ont)} className="text-xs px-2 py-1 rounded transition-colors"
            style={{ background: '#00D4FF22', border: '1px solid #00D4FF44', color: '#00D4FF' }}>
            Autorizar
          </button>
        </div>
      ))}
    </div>
  );
}
