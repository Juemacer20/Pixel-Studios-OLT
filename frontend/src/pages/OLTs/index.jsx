import React, { useState } from 'react';
import { useOLTs } from '../../hooks/useOLTs';
import DataTable from '../../components/shared/DataTable';
import StatusDot from '../../components/shared/StatusDot';
import Drawer from '../../components/shared/Drawer';
import OLTTerminal from '../../components/olts/OLTTerminal';
import { IconTerminal2 } from '@tabler/icons-react';

const COLUMNS = [
  { key: 'status', label: 'Estado', render: r => <StatusDot status={r.status} showLabel /> },
  { key: 'name', label: 'Nombre', accessor: 'name', render: r => <span className="font-mono text-gray-200">{r.name}</span> },
  { key: 'brand', label: 'Marca', accessor: 'brand', render: r => <span className="text-gray-400">{r.brand} {r.model}</span> },
  { key: 'ip', label: 'IP', accessor: 'ip', render: r => <span className="font-mono text-gray-400">{r.ip}</span> },
  { key: 'cpu', label: 'CPU', accessor: 'cpu_usage', render: r => r.cpu_usage != null ? <span style={{ color: r.cpu_usage > 80 ? '#FF3B5C' : '#00FF94' }}>{Math.round(r.cpu_usage)}%</span> : '—' },
  { key: 'temp', label: 'Temp', accessor: 'temperature', render: r => r.temperature != null ? <span className="font-mono text-xs">{r.temperature}°C</span> : '—' },
  { key: 'onts', label: 'ONTs', render: r => <span className="text-gray-300">{r._count?.onts ?? 0}</span> },
  { key: 'location', label: 'Ubicación', accessor: 'location', render: r => <span className="text-gray-500 text-xs">{r.location || '—'}</span> },
];

export default function OLTs() {
  const { data: olts = [], isLoading } = useOLTs();
  const [selectedOLT, setSelectedOLT] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-200">Gestión de OLTs</h1>
        <span className="text-xs text-gray-600 font-mono">{olts.length} OLTs registradas</span>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          columns={COLUMNS}
          data={olts}
          loading={isLoading}
          emptyMessage="No hay OLTs registradas"
        />
      </div>

      <Drawer open={!!selectedOLT} onClose={() => { setSelectedOLT(null); setShowTerminal(false); }}
        title={selectedOLT?.name || ''} width={600}>
        {selectedOLT && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['IP', selectedOLT.ip], ['Marca', `${selectedOLT.brand} ${selectedOLT.model}`], ['Comunidad SNMP', selectedOLT.community], ['Estado', selectedOLT.status], ['CPU', selectedOLT.cpu_usage != null ? `${selectedOLT.cpu_usage}%` : '—'], ['Temp', selectedOLT.temperature != null ? `${selectedOLT.temperature}°C` : '—']].map(([k, v]) => (
                <div key={k} className="rounded p-2" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
                  <div className="text-[10px] text-gray-600">{k}</div>
                  <div className="font-mono text-gray-200 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTerminal(t => !t)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-colors" style={{ background: '#1A2235', border: '1px solid #1E2D45', color: '#00D4FF' }}>
              <IconTerminal2 size={13} /> Terminal CLI
            </button>
            {showTerminal && <OLTTerminal olt={selectedOLT} />}
          </div>
        )}
      </Drawer>
    </div>
  );
}
