import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import CopyButton from '../shared/CopyButton';

export default function MACTable({ ontId }) {
  const { data: macs = [], isLoading } = useQuery({
    queryKey: ['mac-table', ontId],
    queryFn: () => api.get(`/onts/${ontId}/mac-table`).then(r => r.data.data || []).catch(() => []),
    refetchInterval: 30000,
    enabled: !!ontId,
  });
  if (isLoading) return <div className="text-xs text-gray-600 text-center py-4">Cargando...</div>;
  if (!macs.length) return <div className="text-xs text-gray-600 text-center py-4">Sin MACs aprendidas</div>;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {macs.map((m, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
          <span className="font-mono text-gray-300">{m.mac}</span>
          <CopyButton text={m.mac} />
        </div>
      ))}
    </div>
  );
}
