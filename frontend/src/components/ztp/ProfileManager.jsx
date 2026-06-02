import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ztpAPI } from '../../services/api';

export default function ProfileManager() {
  const { data: profiles = [] } = useQuery({ queryKey: ['ztp-profiles'], queryFn: () => ztpAPI.profiles().then(r => r.data.data) });
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold text-gray-400 mb-2">Perfiles ZTP ({profiles.length})</div>
      {profiles.map(p => (
        <div key={p.id} className="rounded-lg p-3 text-xs" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
          <div className="font-medium text-gray-200">{p.name}</div>
          {p.description && <div className="text-gray-500 mt-0.5">{p.description}</div>}
          {p.serviceProfile && <div className="text-[10px] text-gray-600 mt-1">Perfil: {p.serviceProfile.name}</div>}
        </div>
      ))}
    </div>
  );
}
