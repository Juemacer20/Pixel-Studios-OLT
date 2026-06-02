import React from 'react';
import { IconRouter, IconAntenna, IconBell, IconAlertTriangle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../services/api';

function KPICard({ label, value, subtitle, color, icon: Icon }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 transition-transform hover:-translate-y-0.5 cursor-default"
      style={{ background: '#1A2235', border: `1px solid ${color}22` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-[22px] font-bold leading-none" style={{ color: '#E2E8F0' }}>{value ?? '—'}</div>
      {subtitle && <div className="text-xs font-medium" style={{ color }}>{subtitle}</div>}
    </div>
  );
}

export default function KPICards() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.summary().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const cards = [
    { label: 'OLTs', value: data?.totalOLTs, subtitle: 'activas en red', color: '#00D4FF', icon: IconRouter },
    { label: 'ONTs', value: data?.totalONTs, subtitle: `${data?.onlinePercent ?? 0}% online`, color: '#00FF94', icon: IconAntenna },
    { label: 'Alertas Activas', value: data?.activeAlerts, subtitle: `${data?.losCount ?? 0} LOS`, color: data?.activeAlerts > 0 ? '#FF3B5C' : '#00FF94', icon: IconBell },
    { label: 'LOS Activos', value: data?.losCount, subtitle: 'pérdida de señal', color: '#FF6B35', icon: IconAlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => <KPICard key={card.label} {...card} />)}
    </div>
  );
}
