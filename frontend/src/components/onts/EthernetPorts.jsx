import React, { useState } from 'react';
import toast from 'react-hot-toast';

const PORTS = [1, 2, 3, 4];

export default function EthernetPorts({ ontId }) {
  const [vlans, setVlans] = useState({ 1: '', 2: '', 3: '', 4: '' });
  const save = (port) => { toast.success(`VLAN ${vlans[port]} aplicada en Port ${port}`); };
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="text-[10px] text-gray-600 mb-1">ETH port configuration</div>
      <div className="grid grid-cols-2 gap-2">
        {PORTS.map(port => (
          <div key={port} className="rounded-lg p-3" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
            <div className="font-mono text-gray-400 mb-2">ETH {port}</div>
            <div className="flex gap-1">
              <input value={vlans[port]} onChange={e => setVlans(v => ({ ...v, [port]: e.target.value }))}
                placeholder="VLAN ID" className="input-base text-xs py-1 flex-1" />
              <button onClick={() => save(port)} className="btn-primary text-[10px] px-2 py-1">OK</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
