import React, { useState } from 'react';
import { useONTs, useRebootONT } from '../../hooks/useONTs';
import DataTable from '../../components/shared/DataTable';
import StatusDot from '../../components/shared/StatusDot';
import SignalBadge from '../../components/signal/SignalBadge';
import SignalChart from '../../components/signal/SignalChart';
import Drawer from '../../components/shared/Drawer';
import { IconRefresh, IconDownload } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'status', label: 'Estado', render: r => <StatusDot status={r.status} showLabel /> },
  { key: 'serial', label: 'Serial', accessor: 'serial_number', render: r => <span className="font-mono text-[11px] text-gray-300">{r.serial_number}</span> },
  { key: 'client', label: 'Cliente', render: r => <span className="text-gray-400">{r.client?.name || '—'}</span> },
  { key: 'olt', label: 'OLT', render: r => <span className="text-gray-500 text-[10px]">{r.olt?.name}</span> },
  { key: 'port', label: 'PON', render: r => <span className="font-mono text-gray-600 text-[10px]">{r.ponPort?.port_number != null ? `PON ${r.ponPort.port_number}` : '—'}</span> },
  { key: 'rx', label: 'RX', render: r => <SignalBadge value={r.rx_power} type="rx" /> },
  { key: 'tx', label: 'TX', render: r => <SignalBadge value={r.tx_power} type="tx" /> },
  { key: 'last_seen', label: 'Último visto', render: r => <span className="text-gray-600 text-[10px]">{r.last_seen ? new Date(r.last_seen).toLocaleString('es-AR') : '—'}</span> },
];

export default function ONTs() {
  const [params, setParams] = useState({ limit: 100 });
  const { data, isLoading } = useONTs(params);
  const { mutate: reboot } = useRebootONT();
  const [selectedONT, setSelectedONT] = useState(null);

  const onts = data?.data || [];

  const exportCSV = () => {
    const header = 'serial,cliente,olt,status,rx_power,tx_power';
    const rows = onts.map(o => `${o.serial_number},${o.client?.name || ''},${o.olt?.name || ''},${o.status},${o.rx_power || ''},${o.tx_power || ''}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'onts.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReboot = (id) => {
    if (!confirm('¿Reiniciar este ONT?')) return;
    reboot(id, {
      onSuccess: () => toast.success('Reinicio enviado'),
      onError: () => toast.error('Error al reiniciar'),
    });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Gestión de ONTs</h1>
        <div className="flex gap-2">
          <select onChange={e => setParams(p => ({ ...p, status: e.target.value || undefined }))}
            className="text-xs px-2 py-1.5 rounded-md outline-none"
            style={{ background: '#1F2D44', border: '1px solid #1E2D45', color: '#E2E8F0' }}>
            <option value="">Todos los estados</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="LOS">LOS</option>
            <option value="PENDING">Pendiente</option>
          </select>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: '#1A2235', border: '1px solid #1E2D45', color: '#00D4FF' }}>
            <IconDownload size={13} /> CSV
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable columns={COLUMNS} data={onts} loading={isLoading} emptyMessage="No hay ONTs" />
      </div>

      <Drawer open={!!selectedONT} onClose={() => setSelectedONT(null)} title={`ONT — ${selectedONT?.serial_number || ''}`} width={540}>
        {selectedONT && (
          <div className="flex flex-col gap-4">
            <SignalChart ontId={selectedONT.id} />
            <button onClick={() => handleReboot(selectedONT.id)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-md"
              style={{ background: '#1A2235', border: '1px solid #FF6B3522', color: '#FF6B35' }}>
              <IconRefresh size={13} /> Reiniciar ONT
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
