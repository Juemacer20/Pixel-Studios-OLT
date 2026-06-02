import React, { useState } from 'react';
export default function FirmwarePush({ devices = [] }) {
  const [selected, setSelected] = useState([]);
  const [url, setUrl] = useState('');
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="text-gray-400">{devices.length} dispositivos disponibles</div>
      <div className="max-h-40 overflow-y-auto rounded" style={{ border: '1px solid #1E2D45' }}>
        {devices.map(d => (
          <label key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#1F2D44] cursor-pointer">
            <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
            <span className="font-mono">{d.serial_number}</span>
            <span className="text-gray-600">{d.software_version}</span>
          </label>
        ))}
      </div>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL del firmware..." className="input-base" />
      <button className="btn-primary w-fit" disabled={!selected.length || !url}>
        Actualizar {selected.length} dispositivos
      </button>
    </div>
  );
}
