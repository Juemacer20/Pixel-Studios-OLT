import React from 'react';
import {
  IconRouter,
  IconWifi,
  IconAntennaBars5,
  IconAntennaBars1,
  IconAlertTriangle,
  IconClockPlay,
  IconBell,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../services/api';

// ─── Mock data used when the API is unavailable ─────────────────────────────
const MOCK_SUMMARY = {
  totalOLTs:    12,
  onlineOLTs:   10,
  totalONTs:    847,
  onlineONTs:   801,
  losONTs:       18,
  ztpPending:     5,
  activeAlerts:   7,
};

// ─── Individual KPI card ─────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, Icon }) {
  return (
    <div
      className="kpi-card"
      style={{
        borderTopColor: color,
        borderTopWidth: 2,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="kpi-label">{label}</span>
        <Icon size={15} style={{ color, opacity: 0.85, flexShrink: 0 }} />
      </div>

      {/* Big number */}
      <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
        {value != null ? value : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>

      {/* Sub-text */}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function KPICards() {
  const { data, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardAPI.summary().then((r) => r.data?.data ?? r.data),
    refetchInterval: 30_000,
    retry: 1,
  });

  // Fall back to mock when the API is unavailable
  const d = isError || !data ? MOCK_SUMMARY : data;

  const oltOnlinePct  = d.totalOLTs ? Math.round((d.onlineOLTs  / d.totalOLTs)  * 100) : 0;
  const ontOnlinePct  = d.totalONTs ? Math.round((d.onlineONTs  / d.totalONTs)  * 100) : 0;

  const cards = [
    {
      label: 'Total OLTs',
      value: d.totalOLTs,
      sub:   `${d.onlineOLTs ?? 0} activas`,
      color: 'var(--accent)',
      Icon:  IconRouter,
    },
    {
      label: 'OLTs Online',
      value: d.onlineOLTs,
      sub:   `${oltOnlinePct}% disponibilidad`,
      color: 'var(--green)',
      Icon:  IconWifi,
    },
    {
      label: 'Total ONTs',
      value: d.totalONTs,
      sub:   'en toda la red',
      color: 'var(--accent)',
      Icon:  IconAntennaBars5,
    },
    {
      label: 'ONTs Online',
      value: d.onlineONTs,
      sub:   `${ontOnlinePct}% disponibilidad`,
      color: 'var(--green)',
      Icon:  IconAntennaBars5,
    },
    {
      label: 'LOS',
      value: d.losONTs,
      sub:   'pérdida de señal',
      color: (d.losONTs ?? 0) > 0 ? 'var(--red)' : 'var(--green)',
      Icon:  IconAntennaBars1,
    },
    {
      label: 'ZTP Pendientes',
      value: d.ztpPending,
      sub:   'ONTs sin autorizar',
      color: (d.ztpPending ?? 0) > 0 ? 'var(--orange)' : 'var(--text-muted)',
      Icon:  IconClockPlay,
    },
    {
      label: 'Alertas Activas',
      value: d.activeAlerts,
      sub:   (d.activeAlerts ?? 0) > 0 ? 'requieren atención' : 'sin alertas',
      color: (d.activeAlerts ?? 0) > 0 ? 'var(--red)' : 'var(--green)',
      Icon:  IconBell,
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <KPICard key={card.label} {...card} />
      ))}
    </div>
  );
}
