import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { IconBell, IconMail, IconPhone, IconPlus, IconTrash } from '@tabler/icons-react';

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [addChannel, setAddChannel] = useState('');
  const [addDest, setAddDest] = useState('');
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
  });
  const addMut = useMutation({
    mutationFn: (data) => api.post('/notifications', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notification-configs'] }); setAddChannel(''); setAddDest(''); toast.success('Notification added'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notification-configs'] }); toast.success('Deleted'); },
  });
  const handleAdd = (e) => { e.preventDefault(); if (addChannel && addDest) addMut.mutate({ channel: addChannel, destination: addDest, enabled: true }); };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-base font-semibold text-gray-200">Notification settings</h1>
      <div className="grid grid-cols-3 gap-3">
        {[{ icon: IconMail, label: 'Email', channel: 'email' }, { icon: IconPhone, label: 'SMS', channel: 'sms' }, { icon: IconBell, label: 'Webhook', channel: 'webhook' }].map(({ icon: Icon, label, channel }) => {
          const configsForChannel = configs.filter(c => c.channel === channel);
          return (
            <div key={channel} className="rounded-lg p-4" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color: '#00D4FF' }} />
                <span className="text-sm font-medium text-gray-300">{label}</span>
              </div>
              {configsForChannel.map(cfg => (
                <div key={cfg.id} className="flex items-center justify-between text-xs text-gray-400 mb-1 py-1 px-2 rounded" style={{ background: '#0F172A' }}>
                  <span>{cfg.destination}{cfg.enabled ? '' : ' (disabled)'}</span>
                  <button onClick={() => delMut.mutate(cfg.id)} className="text-red-400 hover:text-red-300"><IconTrash size={12} /></button>
                </div>
              ))}
              {configsForChannel.length === 0 && <div className="text-xs text-gray-600 mb-2">No {channel} configured</div>}
            </div>
          );
        })}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2 items-center" style={{ padding: '12px 0', borderTop: '1px solid #1E2D45' }}>
        <select className="input-base text-xs" value={addChannel} onChange={e => setAddChannel(e.target.value)} required>
          <option value="">Channel</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="webhook">Webhook</option>
        </select>
        <input className="input-base text-xs flex-1" value={addDest} onChange={e => setAddDest(e.target.value)} placeholder="Destination (email/phone/URL)" required />
        <button type="submit" className="btn btn-primary text-xs" style={{ padding: '4px 12px' }}><IconPlus size={12} /> Add</button>
      </form>
    </div>
  );
}
