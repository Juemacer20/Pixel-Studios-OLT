import React, { useState } from 'react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import { IconCheck, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const SEV_COLORS = { CRITICAL: '#FF3B5C', HIGH: '#FF6B35', MEDIUM: '#F59E0B', LOW: '#6B7280', INFO: '#00D4FF' };

export default function Alerts() {
  const [filter, setFilter] = useState({ resolved: false });
  const { data, isLoading } = useAlerts(filter);
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();
  const alerts = data?.data || [];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Alertas</h1>
        <div className="flex gap-2">
          {[{ label: 'Activas', value: { resolved: false } }, { label: 'Reconocidas', value: { acknowledged: true, resolved: false } }, { label: 'Historial', value: { resolved: true } }].map(f => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{ background: JSON.stringify(filter) === JSON.stringify(f.value) ? '#00D4FF22' : '#1A2235', border: `1px solid ${JSON.stringify(filter) === JSON.stringify(f.value) ? '#00D4FF44' : '#1E2D45'}`, color: JSON.stringify(filter) === JSON.stringify(f.value) ? '#00D4FF' : '#6B7280' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
        <table className="w-full text-xs">
          <thead style={{ background: '#111827' }}>
            <tr>
              {['Severidad', 'Tipo', 'Mensaje', 'Creado', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-600">Cargando...</td></tr>
            ) : alerts.map(alert => (
              <tr key={alert.id} className="border-t border-[#1E2D45] hover:bg-[#1F2D44]">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[10px] font-semibold" style={{ color: SEV_COLORS[alert.severity] }}>[{alert.severity}]</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-gray-400">{alert.type}</td>
                <td className="px-3 py-2.5 text-gray-300 max-w-xs truncate">{alert.message}</td>
                <td className="px-3 py-2.5 text-gray-600 text-[10px]">{new Date(alert.created_at).toLocaleString('es-AR')}</td>
                <td className="px-3 py-2.5">
                  {alert.resolved ? <span className="text-green-500 text-[10px]">Resuelto</span>
                    : alert.acknowledged ? <span className="text-orange-400 text-[10px]">Reconocido</span>
                    : <span className="text-red-400 text-[10px]">Activo</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-2">
                    {!alert.acknowledged && !alert.resolved && (
                      <button onClick={() => acknowledge(alert.id)} className="text-gray-600 hover:text-green-400 transition-colors" title="Reconocer">
                        <IconCheck size={12} />
                      </button>
                    )}
                    {!alert.resolved && (
                      <button onClick={() => resolve(alert.id)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Resolver">
                        <IconX size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
