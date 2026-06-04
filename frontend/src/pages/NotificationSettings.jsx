import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { IconBell, IconMail, IconPhone } from '@tabler/icons-react';

export default function NotificationSettings() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-base font-semibold text-gray-200">Notification settings</h1>
      <div className="grid grid-cols-3 gap-3">
        {[{ icon: IconMail, label: 'Email', channel: 'email' }, { icon: IconPhone, label: 'SMS', channel: 'sms' }, { icon: IconBell, label: 'Webhook', channel: 'webhook' }].map(({ icon: Icon, label, channel }) => {
          const config = configs.find(c => c.channel === channel);
          return (
            <div key={channel} className="rounded-lg p-4" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color: '#00D4FF' }} />
                <span className="text-sm font-medium text-gray-300">{label}</span>
                {config?.enabled && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#00FF9422', color: '#00FF94' }}>Active</span>}
              </div>
              <div className="text-xs text-gray-500">{config?.destination || 'Not configured'}</div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600">Notifications are configured via API. Configuration form coming soon.</p>
    </div>
  );
}
