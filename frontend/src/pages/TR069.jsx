import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tr069API } from '../services/api';
import DataTable from '../components/shared/DataTable';
import Drawer from '../components/shared/Drawer';
import TR069DeviceDrawer from '../components/tr069/TR069DeviceDrawer';

const COLUMNS = [
  { key: 'sn', label: 'Serial', accessor: 'serial_number', render: r => <span className="font-mono text-gray-200 text-[11px]">{r.serial_number}</span> },
  { key: 'manufacturer', label: 'Fabricante', accessor: 'manufacturer' },
  { key: 'model', label: 'Modelo', accessor: 'product_class' },
  { key: 'sw', label: 'Firmware', accessor: 'software_version', render: r => <span className="font-mono text-gray-400 text-[10px]">{r.software_version || '—'}</span> },
  { key: 'ip', label: 'IP', accessor: 'ip_address', render: r => <span className="font-mono text-gray-400 text-[10px]">{r.ip_address || '—'}</span> },
  { key: 'inform', label: 'Último Inform', render: r => <span className="text-gray-600 text-[10px]">{r.last_inform ? new Date(r.last_inform).toLocaleString('es-AR') : '—'}</span> },
];

export default function TR069() {
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['tr069-devices'],
    queryFn: () => tr069API.devices().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const [selected, setSelected] = useState(null);

  const online = devices.filter(d => d.last_inform && (Date.now() - new Date(d.last_inform)) < 5 * 60 * 1000).length;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Gestión TR-069</h1>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-gray-500">Total: <span className="text-gray-200">{devices.length}</span></span>
          <span className="text-gray-500">Online: <span style={{ color: '#00FF94' }}>{online}</span></span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable columns={COLUMNS} data={devices} loading={isLoading} emptyMessage="Sin dispositivos TR-069" />
      </div>

      <TR069DeviceDrawer device={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
