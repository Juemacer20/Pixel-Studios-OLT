import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SpeedControl({ ontId }) {
  const [selected, setSelected] = useState('');
  const { data: profiles = [] } = useQuery({
    queryKey: ['speed-profiles'],
    queryFn: () => api.get('/speed-profiles').then(r => r.data.data || []).catch(() => []),
  });
  const apply = async () => {
    if (!selected) return;
    try { await api.post(`/speed-profiles/apply/${ontId}`, { profileId: selected }); toast.success('Plan aplicado'); }
    catch (e) { toast.error('Error al aplicar plan'); }
  };
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="text-[10px] text-gray-600">Plan de velocidad</div>
      <select value={selected} onChange={e => setSelected(e.target.value)} className="input-base text-xs">
        <option value="">Seleccionar plan...</option>
        {profiles.map(p => <option key={p.id} value={p.id}>{p.name} — ↓{p.download_mbps}Mbps ↑{p.upload_mbps}Mbps</option>)}
      </select>
      <button onClick={apply} disabled={!selected} className="btn-primary w-fit text-xs">Aplicar</button>
    </div>
  );
}
