import React, { useState } from 'react';
import { useOLTs } from '../../hooks/useOLTs';
import StatusDot from '../shared/StatusDot';

const BRANDS = ['Todas', 'Huawei', 'KingType', 'VSOL'];

function CPUBar({ value }) {
  const color = value > 80 ? '#FF3B5C' : value > 60 ? '#FF6B35' : '#00FF94';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1E2D45' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value || 0)}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] w-7 text-right" style={{ color }}>{value != null ? `${Math.round(value)}%` : '—'}</span>
    </div>
  );
}

export default function OLTTable({ onSelect }) {
  const [brandFilter, setBrandFilter] = useState('Todas');
  const { data: olts = [], isLoading } = useOLTs();

  const filtered = brandFilter === 'Todas' ? olts : olts.filter(o => o.brand?.toLowerCase().includes(brandFilter.toLowerCase()));

  return (
    <div className="rounded-lg flex flex-col h-full" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1E2D45' }}>
        <span className="text-xs font-semibold text-gray-400">OLTs</span>
        <div className="flex gap-1">
          {BRANDS.map(b => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                background: brandFilter === b ? '#00D4FF22' : 'transparent',
                color: brandFilter === b ? '#00D4FF' : '#6B7280',
                border: `1px solid ${brandFilter === b ? '#00D4FF44' : '#1E2D45'}`,
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead style={{ background: '#111827' }}>
            <tr>
              {['Estado', 'Nombre', 'Marca', 'PON', 'ONTs', 'CPU', 'Uptime'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-600">Cargando...</td></tr>
            ) : filtered.map(olt => (
              <tr
                key={olt.id}
                onClick={() => onSelect?.(olt)}
                className="border-t border-[#1E2D45] hover:bg-[#1F2D44] cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5"><StatusDot status={olt.status} /></td>
                <td className="px-3 py-2.5 font-mono text-gray-200">{olt.name}</td>
                <td className="px-3 py-2.5 text-gray-400">{olt.brand}</td>
                <td className="px-3 py-2.5 text-gray-400">{olt._count?.ponPorts ?? 0}</td>
                <td className="px-3 py-2.5 text-gray-300">{olt._count?.onts ?? 0}</td>
                <td className="px-3 py-2.5 w-28"><CPUBar value={olt.cpu_usage} /></td>
                <td className="px-3 py-2.5 font-mono text-gray-500 text-[10px]">
                  {olt.uptime ? formatUptime(Number(olt.uptime)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatUptime(ticks) {
  const sec = ticks / 100;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return `${d}d ${h}h`;
}
