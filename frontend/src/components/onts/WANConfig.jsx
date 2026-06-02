import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const MODES = ['DHCP', 'Static', 'PPPoE'];

export default function WANConfig({ ontId }) {
  const [mode, setMode] = useState('DHCP');
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    if (!confirm(`¿Aplicar configuración WAN ${mode}?`)) return;
    toast.success(`Configuración WAN ${mode} aplicada`);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex gap-1">
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="px-3 py-1.5 rounded-md transition-colors"
            style={{ background: mode === m ? '#00D4FF22' : '#1A2235', color: mode === m ? '#00D4FF' : '#6B7280', border: `1px solid ${mode === m ? '#00D4FF44' : '#1E2D45'}` }}>
            {m}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        {mode === 'Static' && <>
          <div><label className="text-[10px] text-gray-600">IP</label><input {...register('ip')} className="input-base mt-1" placeholder="192.168.1.100" /></div>
          <div><label className="text-[10px] text-gray-600">Gateway</label><input {...register('gateway')} className="input-base mt-1" placeholder="192.168.1.1" /></div>
          <div><label className="text-[10px] text-gray-600">DNS</label><input {...register('dns')} className="input-base mt-1" placeholder="8.8.8.8" /></div>
        </>}
        {mode === 'PPPoE' && <>
          <div><label className="text-[10px] text-gray-600">Usuario</label><input {...register('username')} className="input-base mt-1" /></div>
          <div><label className="text-[10px] text-gray-600">Contraseña</label><input type="password" {...register('password')} className="input-base mt-1" /></div>
        </>}
        {mode === 'DHCP' && <div className="text-gray-500 py-2">Configuración automática vía DHCP</div>}
        <button type="submit" className="btn-primary w-fit mt-2">Aplicar</button>
      </form>
    </div>
  );
}
