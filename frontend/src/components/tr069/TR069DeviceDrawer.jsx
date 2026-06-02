import React, { useState } from 'react';
import Drawer from '../shared/Drawer';

const TABS = ['Info', 'Parámetros', 'WiFi', 'Diagnósticos', 'Firmware', 'Tareas'];

export default function TR069DeviceDrawer({ device, onClose }) {
  const [activeTab, setActiveTab] = useState('Info');
  if (!device) return null;

  return (
    <Drawer open={!!device} onClose={onClose} title={`CPE — ${device.serial_number}`} width={580}>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: activeTab === tab ? '#00D4FF22' : '#1A2235', color: activeTab === tab ? '#00D4FF' : '#6B7280', border: `1px solid ${activeTab === tab ? '#00D4FF44' : '#1E2D45'}` }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Info' && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[['Serial', device.serial_number], ['OUI', device.oui || '—'], ['Fabricante', device.manufacturer || '—'], ['Modelo', device.product_class || '—'], ['Firmware', device.software_version || '—'], ['Hardware', device.hardware_version || '—'], ['IP', device.ip_address || '—'], ['Último Inform', device.last_inform ? new Date(device.last_inform).toLocaleString('es-AR') : '—']].map(([k, v]) => (
            <div key={k} className="rounded p-2" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-[10px] text-gray-600 mb-0.5">{k}</div>
              <div className="font-mono text-gray-200">{v}</div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'Parámetros' && (
        <div className="rounded-lg p-3 text-xs font-mono" style={{ background: '#080D18', border: '1px solid #1E2D45' }}>
          <pre className="text-gray-400 overflow-auto max-h-80">{JSON.stringify(device.parameters || {}, null, 2)}</pre>
        </div>
      )}
      {activeTab === 'WiFi' && <div className="text-xs text-gray-600 py-8 text-center">Configuración WiFi disponible vía TR-069 RPC</div>}
      {activeTab === 'Diagnósticos' && <div className="text-xs text-gray-600 py-8 text-center">Diagnósticos: ping, traceroute vía TR-069</div>}
      {activeTab === 'Firmware' && <FirmwarePushTab device={device} />}
      {activeTab === 'Tareas' && <div className="text-xs text-gray-600 py-8 text-center">Cola de tareas pendientes</div>}
    </Drawer>
  );
}

function FirmwarePushTab({ device }) {
  const [url, setUrl] = useState('');
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="text-gray-400">Firmware actual: <span className="font-mono text-gray-200">{device.software_version || '—'}</span></div>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL del firmware..." className="input-base text-xs" />
      <button className="btn-primary text-xs w-fit" disabled={!url}>Programar actualización</button>
    </div>
  );
}
