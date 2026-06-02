import React, { useState } from 'react';
import Drawer from '../shared/Drawer';
import { ztpAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function ZTPDrawer({ ont, onClose }) {
  const [profileId, setProfileId] = useState('');
  const qc = useQueryClient();
  const { data: profiles = [] } = useQuery({ queryKey: ['ztp-profiles'], queryFn: () => ztpAPI.profiles().then(r => r.data.data) });
  const { mutate: authorize, isPending } = useMutation({
    mutationFn: () => ztpAPI.authorize(ont.id, profileId),
    onSuccess: () => { toast.success(`ONT ${ont.serial_number} autorizada`); qc.invalidateQueries({ queryKey: ['ztp-pending'] }); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Drawer open={!!ont} onClose={onClose} title="Autorizar ONT" width={400}>
      {ont && (
        <div className="flex flex-col gap-4 text-xs">
          <div className="rounded-lg p-3" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <div className="text-[10px] text-gray-600 mb-1">Serial</div>
            <div className="font-mono text-gray-200">{ont.serial_number}</div>
            <div className="text-[10px] text-gray-600 mt-2 mb-1">OLT</div>
            <div className="text-gray-400">{ont.olt?.name}</div>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 block mb-1">Perfil ZTP</label>
            <select value={profileId} onChange={e => setProfileId(e.target.value)} className="input-base text-xs">
              <option value="">Seleccionar perfil...</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => authorize()} disabled={!profileId || isPending} className="btn-primary text-xs">
            {isPending ? 'Autorizando...' : 'Autorizar ONT'}
          </button>
        </div>
      )}
    </Drawer>
  );
}
