import React, { useState } from 'react';
import { IconChevronRight, IconChevronDown, IconRouter, IconAntenna } from '@tabler/icons-react';
import { useOLTs } from '../../hooks/useOLTs';
import StatusDot from '../shared/StatusDot';

function ONTNode({ ont, onSelect }) {
  return (
    <div
      onClick={() => onSelect?.(ont)}
      className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-[#1F2D44] transition-colors ml-8"
    >
      <IconAntenna size={11} style={{ color: ont.status === 'ONLINE' ? '#00FF94' : '#6B7280' }} />
      <span className="font-mono text-[10px] text-gray-400">{ont.serial_number}</span>
      <StatusDot status={ont.status} size={6} />
      {ont.client && <span className="text-[10px] text-gray-600 truncate">{ont.client.name}</span>}
    </div>
  );
}

function PONPortNode({ port, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const onts = port.onts || [];
  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-[#1F2D44] transition-colors ml-4"
      >
        {expanded ? <IconChevronDown size={10} className="text-gray-500" /> : <IconChevronRight size={10} className="text-gray-500" />}
        <span className="text-[10px] text-gray-500 font-mono">PON {port.port_number}</span>
        <span className="text-[9px] text-gray-700">{port._count?.onts ?? 0} ONTs</span>
      </div>
      {expanded && onts.map(ont => <ONTNode key={ont.id} ont={ont} onSelect={onSelect} />)}
    </div>
  );
}

function OLTNode({ olt, onSelectONT }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-1">
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-[#1F2D44] transition-colors"
      >
        {expanded ? <IconChevronDown size={11} className="text-gray-500" /> : <IconChevronRight size={11} className="text-gray-500" />}
        <IconRouter size={12} style={{ color: olt.status === 'ONLINE' ? '#00D4FF' : '#6B7280' }} />
        <span className="text-xs font-medium text-gray-300">{olt.name}</span>
        <span className="text-[9px] text-gray-600">{olt.brand}</span>
        <StatusDot status={olt.status} size={6} />
      </div>
      {expanded && (olt.ponPorts || []).map(port => (
        <PONPortNode key={port.id} port={port} onSelect={onSelectONT} />
      ))}
    </div>
  );
}

export default function FiberTree({ onSelectONT }) {
  const { data: olts = [] } = useOLTs();
  return (
    <div className="rounded-lg p-3" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
      <div className="text-xs font-semibold text-gray-500 mb-3 px-2">Árbol de Red</div>
      {olts.map(olt => <OLTNode key={olt.id} olt={olt} onSelectONT={onSelectONT} />)}
    </div>
  );
}
