import React from 'react';
import { useONTs } from '../../hooks/useONTs';
import { useRebootONT } from '../../hooks/useONTs';
import StatusDot from '../shared/StatusDot';
import SignalBadge from '../signal/SignalBadge';
import { IconRefresh } from '@tabler/icons-react';
import toast from 'react-hot-toast';

export default function ONTTable({ oltId, onSelect }) {
  const { data, isLoading } = useONTs({ oltId, limit: 50 });
  const { mutate: reboot } = useRebootONT();
  const onts = data?.data || [];

  const handleReboot = (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Reiniciar este ONT?')) return;
    reboot(id, {
      onSuccess: () => toast.success('Reinicio enviado'),
      onError: () => toast.error('Error al reiniciar'),
    });
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1E2D45' }}>
        <span className="text-xs font-semibold text-gray-400">ONTs recientes</span>
      </div>
      <table className="w-full text-xs">
        <thead style={{ background: '#111827' }}>
          <tr>
            {['Estado', 'Serial', 'Cliente', 'OLT', 'RX', 'TX', ''].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={7} className="text-center py-6 text-gray-600">Cargando...</td></tr>
          ) : onts.slice(0, 20).map(ont => (
            <tr
              key={ont.id}
              onClick={() => onSelect?.(ont)}
              className="border-t border-[#1E2D45] hover:bg-[#1F2D44] cursor-pointer transition-colors"
            >
              <td className="px-3 py-2"><StatusDot status={ont.status} /></td>
              <td className="px-3 py-2 font-mono text-gray-300">{ont.serial_number}</td>
              <td className="px-3 py-2 text-gray-400 truncate max-w-28">{ont.client?.name || '—'}</td>
              <td className="px-3 py-2 text-gray-500">{ont.olt?.name}</td>
              <td className="px-3 py-2"><SignalBadge value={ont.rx_power} /></td>
              <td className="px-3 py-2"><SignalBadge value={ont.tx_power} type="tx" /></td>
              <td className="px-3 py-2">
                <button onClick={(e) => handleReboot(e, ont.id)} className="text-gray-600 hover:text-orange-400 transition-colors">
                  <IconRefresh size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
