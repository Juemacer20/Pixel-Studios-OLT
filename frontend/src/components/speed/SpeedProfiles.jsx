import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
export default function SpeedProfiles() {
  const { data: profiles = [] } = useQuery({ queryKey: ['speed-profiles'], queryFn: () => api.get('/speed-profiles').then(r => r.data.data || []).catch(() => []) });
  return (
    <div className="flex flex-col gap-2 text-xs">
      {profiles.map(p => (
        <div key={p.id} className="rounded p-3" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
          <div className="font-medium text-gray-200">{p.name}</div>
          <div className="text-gray-500 mt-1">↓{p.download_mbps}Mbps ↑{p.upload_mbps}Mbps</div>
        </div>
      ))}
    </div>
  );
}
