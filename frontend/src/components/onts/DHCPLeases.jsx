import React from 'react';
import { useDHCPLeases } from '../../hooks/useONTs';
import CopyButton from '../shared/CopyButton';

export default function DHCPLeases({ ontId }) {
  const { data: leases = [], isLoading } = useDHCPLeases(ontId);
  if (isLoading) return <div className="text-xs text-gray-600 text-center py-4">Loading...</div>;
  if (!leases.length) return <div className="text-xs text-gray-600 text-center py-4">Sin leases activos</div>;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {leases.map(l => (
        <div key={l.id} className="flex items-center justify-between p-2 rounded" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
          <div>
            <div className="font-mono text-gray-200">{l.ip}</div>
            <div className="text-[10px] text-gray-600">{l.mac} · {l.hostname || '—'}</div>
          </div>
          <CopyButton text={l.ip} />
        </div>
      ))}
    </div>
  );
}
