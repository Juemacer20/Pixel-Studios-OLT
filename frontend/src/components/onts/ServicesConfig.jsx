import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ServicesConfig({ ontId }) {
  const [services, setServices] = useState({ datos: true, voip: false, iptv: false });
  const toggle = (key) => setServices(s => { const ns = { ...s, [key]: !s[key] }; toast.success(`Servicio ${key} ${ns[key] ? 'activado' : 'desactivado'}`); return ns; });
  return (
    <div className="flex flex-col gap-3 text-xs">
      {[['datos', 'Datos', '#00D4FF', '🌐'], ['voip', 'VoIP', '#00FF94', '📞'], ['iptv', 'IPTV', '#A855F7', '📺']].map(([key, label, color, icon]) => (
        <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1A2235', border: `1px solid ${services[key] ? color + '33' : '#1E2D45'}` }}>
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <div>
              <div className="font-medium text-gray-200">{label}</div>
              <div className="text-[10px] text-gray-600">{services[key] ? 'Activo' : 'Inactivo'}</div>
            </div>
          </div>
          <button onClick={() => toggle(key)} className="w-10 h-5 rounded-full transition-colors relative"
            style={{ background: services[key] ? color : '#1E2D45' }}>
            <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: services[key] ? '24px' : '2px' }} />
          </button>
        </div>
      ))}
    </div>
  );
}
