import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Drawer from '../../components/shared/Drawer';
import SignalChart from '../../components/signal/SignalChart';
import StatusDot from '../../components/shared/StatusDot';

const COLUMNS = [
  { key: 'name', label: 'Cliente', accessor: 'name', render: r => <span className="font-medium text-gray-200">{r.name}</span> },
  { key: 'contract', label: 'Contrato', accessor: 'contract_number', render: r => <span className="font-mono text-gray-400 text-[10px]">{r.contract_number || '—'}</span> },
  { key: 'plan', label: 'Plan', accessor: 'service_plan', render: r => <span className="text-gray-400">{r.service_plan || '—'}</span> },
  { key: 'phone', label: 'Teléfono', accessor: 'phone', render: r => <span className="font-mono text-gray-500 text-[10px]">{r.phone || '—'}</span> },
  { key: 'ont', label: 'ONT', render: r => <span className="font-mono text-[10px] text-gray-500">{r.ont?.serial_number}</span> },
  { key: 'status', label: 'Estado ONT', render: r => <StatusDot status={r.ont?.status || 'OFFLINE'} showLabel /> },
];

export default function Clients() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientAPI.list({ search, limit: 200 }).then(r => r.data.data),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Clientes</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar por nombre, contrato, teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md outline-none w-64"
            style={{ background: '#1F2D44', border: '1px solid #1E2D45', color: '#E2E8F0' }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          columns={COLUMNS}
          data={data || []}
          loading={isLoading}
          emptyMessage="No hay clientes"
          searchable={false}
        />
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} width={540}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Nombre', selected.name], ['Contrato', selected.contract_number || '—'], ['Plan', selected.service_plan || '—'], ['Teléfono', selected.phone || '—'], ['Email', selected.email || '—'], ['Dirección', selected.address || '—']].map(([k, v]) => (
                <div key={k} className="rounded p-2" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
                  <div className="text-[10px] text-gray-600">{k}</div>
                  <div className="text-gray-200 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {selected.ont && <SignalChart ontId={selected.ont.id} />}
          </div>
        )}
      </Drawer>
    </div>
  );
}
