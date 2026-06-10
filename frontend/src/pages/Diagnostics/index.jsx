import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { oltAPI } from '../../services/api';

function signalColor(val) {
  if (val == null) return 'text-gray-500';
  if (val > -25) return 'text-green-400';
  if (val > -27) return 'text-yellow-400';
  return 'text-red-400';
}

function fmtDbm(val) {
  if (val == null) return <span className="text-gray-600">—</span>;
  return <span className={`font-mono ${signalColor(val)}`}>{val.toFixed(2)}</span>;
}

function relTime(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function exportCSV(onts) {
  const header = 'Status,Rx OLT (dBm),Rx ONU (dBm),Distance (m),Name,SN,OLT,Interface,Last Seen';
  const rows = onts.map(o => [
    o.status,
    o.olt_rx_power ?? '',
    o.rx_power ?? '',
    o.distance ?? '',
    (o.description || '').replace(/,/g, ' '),
    o.serial_number,
    o.olt?.name || '',
    o.description?.startsWith('gpon') ? o.description : '',
    o.last_seen ? new Date(o.last_seen).toISOString() : '',
  ].join(','));
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `diagnostics-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

export default function Diagnostics() {
  const [status, setStatus] = useState('');
  const [oltId, setOltId] = useState('');

  const { data: oltsData } = useQuery({
    queryKey: ['olts-list'],
    queryFn: () => oltAPI.list({}).then(r => r.data?.data ?? r.data),
  });
  const olts = Array.isArray(oltsData) ? oltsData : oltsData?.items || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['diagnostics', status, oltId],
    queryFn: () => api.get('/diagnostics', { params: { status: status || undefined, olt_id: oltId || undefined, limit: 2000 } }).then(r => r.data?.data ?? r.data),
  });

  const onts = useMemo(() => Array.isArray(data) ? data : [], [data]);

  return (
    <div className="p-4 min-h-screen">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          className="bg-[#1a2035] border border-[#2a3a5c] text-gray-200 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All status</option>
          <option value="online">Online</option>
          <option value="offline">Offline / LOS</option>
        </select>

        <select
          value={oltId} onChange={e => setOltId(e.target.value)}
          className="bg-[#1a2035] border border-[#2a3a5c] text-gray-200 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All OLTs</option>
          {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <button onClick={() => refetch()}
          className="bg-[#1a2035] border border-[#2a3a5c] text-gray-300 hover:text-white px-3 py-1.5 rounded text-sm">
          ↻ Refresh
        </button>

        <button onClick={() => exportCSV(onts)}
          className="bg-[#0e3a5c] border border-[#00D4FF44] text-[#00D4FF] hover:bg-[#0e4a7c] px-3 py-1.5 rounded text-sm ml-auto">
          ↓ Export CSV
        </button>

        <span className="text-gray-400 text-sm">{onts.length} ONTs</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-400 text-center py-16">Cargando diagnósticos…</div>
      ) : onts.length === 0 ? (
        <div className="text-gray-500 text-center py-16">Sin datos de señal todavía</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1e3a5c]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0d1b35] text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Rx OLT (dBm)</th>
                <th className="px-3 py-2">Rx ONU (dBm)</th>
                <th className="px-3 py-2">Dist (m)</th>
                <th className="px-3 py-2">Nombre / Interfaz</th>
                <th className="px-3 py-2">SN</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">ODB</th>
                <th className="px-3 py-2">OLT</th>
                <th className="px-3 py-2">Último cambio</th>
              </tr>
            </thead>
            <tbody>
              {onts.map((ont, i) => (
                <tr key={ont.id}
                  className={`border-t border-[#1e3a5c] ${i % 2 === 0 ? 'bg-[#0d1b2e]' : 'bg-[#0a1626]'} hover:bg-[#1a2a4a]`}>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ont.status === 'ONLINE' ? 'bg-green-400' : 'bg-red-500'}`} />
                    <span className={ont.status === 'ONLINE' ? 'text-green-400' : 'text-red-400'}>
                      {ont.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{fmtDbm(ont.olt_rx_power)}</td>
                  <td className="px-3 py-1.5">{fmtDbm(ont.rx_power)}</td>
                  <td className="px-3 py-1.5 font-mono text-gray-400">
                    {ont.distance != null ? ont.distance : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-1.5 max-w-xs truncate text-gray-200">
                    {ont.description || <span className="text-gray-600 italic">sin nombre</span>}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-gray-400 text-xs">{ont.serial_number}</td>
                  <td className="px-3 py-1.5 text-gray-400 text-xs">{ont.zone || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-400 text-xs">{ont.odb || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-400">{ont.olt?.name}</td>
                  <td className="px-3 py-1.5 text-gray-500 text-xs">{relTime(ont.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
