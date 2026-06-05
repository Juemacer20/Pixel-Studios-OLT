import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  IconWand, IconCircleCheck, IconX, IconAlertTriangle, IconRefresh,
  IconClock, IconServer2,
} from '@tabler/icons-react';
import { dashboardAPI, oltAPI } from '../../services/api';
import { useAlerts } from '../../hooks/useAlerts';
import { useAlertStore } from '../../store/alertStore';

// ── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}
function fmt(n) { return n == null ? '—' : Number(n).toLocaleString('es-AR'); }
function uptimeStr(o) {
  return o.uptime || o.uptime_str || (o.uptime_seconds
    ? `${Math.floor(o.uptime_seconds / 86400)}d ${new Date(o.uptime_seconds * 1000).toISOString().substr(11, 8)}`
    : '—');
}

// Serie de "online" para el área (deriva del valor actual con variación suave).
// TODO: reemplazar por endpoint histórico /dashboard/network-status cuando exista.
function buildNetSeries(base) {
  const b = base || 0;
  return Array.from({ length: 48 }, (_, i) => ({
    t: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
    online: Math.max(0, Math.round(b + Math.sin(i / 4) * (b * 0.01) + (Math.random() - 0.5) * (b * 0.008))),
  }));
}

// ── stat box ─────────────────────────────────────────────────────────────────
function StatBox({ to, cls, Icon, num, label, foot }) {
  return (
    <NavLink to={to} className={`sol-statbox ${cls}`}>
      <Icon className="ico" size={30} />
      <div><div className="num">{num}</div><div className="lbl">{label}</div></div>
      {foot && <div className="foot">{foot.map((f, i) => <span key={i}>{f}</span>)}</div>}
    </NavLink>
  );
}

// ── dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  useAlerts({ resolved: false });

  const { data: sum } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardAPI.summary().then(r => r.data?.data ?? r.data),
    refetchInterval: 30_000, retry: 1,
  });
  const d = sum || {};

  const { data: oltsRaw } = useQuery({
    queryKey: ['olts', {}],
    queryFn: () => oltAPI.list().then(r => r.data?.data ?? r.data),
    refetchInterval: 60_000, retry: 1,
  });
  const olts = Array.isArray(oltsRaw) ? oltsRaw : [];

  const activeAlerts = useAlertStore(s => s.activeAlerts);
  const feed = useMemo(() => activeAlerts.slice(0, 12), [activeAlerts]);

  const online  = d.onlineONTs ?? 0;
  const total   = d.totalONTs ?? 0;
  const offline = Math.max(0, total - online);
  const waiting = d.ztpPending ?? 0;
  const warning = d.activeAlerts ?? activeAlerts.length ?? 0;
  const los     = d.losONTs ?? 0;

  const netSeries  = useMemo(() => buildNetSeries(online), [online]);
  // TODO: reemplazar por endpoint /dashboard/authorizations-per-day
  const authSeries = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    d: `${i + 1}`, n: Math.round(20 + Math.random() * 70),
  })), []);

  const oltsOffline = olts.filter(o => o.status && o.status !== 'online').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Stat boxes ── */}
      <div className="sol-stats">
        <StatBox to="/onu/unconfigured" cls="sol-s-blue" Icon={IconWand}    num={fmt(waiting)} label="Waiting authorization" foot={[`Pending: ${fmt(waiting)}`]} />
        <StatBox to="/onts"   cls="sol-s-green"  Icon={IconCircleCheck}   num={fmt(online)}  label="Online"  foot={[`Total authorized: ${fmt(total)}`]} />
        <StatBox to="/onts"   cls="sol-s-slate"  Icon={IconX}             num={fmt(offline)} label="Offline" foot={[`LOS: ${fmt(los)}`]} />
        <StatBox to="/alerts" cls="sol-s-orange" Icon={IconAlertTriangle} num={fmt(warning)} label="Warning" foot={[`Active alerts: ${fmt(warning)}`]} />
      </div>

      {/* ── Row: network status + OLTs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>📊 Network status</span><span className="more">More graphs ▸</span></div>
            <div style={{ padding: 14 }}>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={netSeries} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="gOnline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#23a85a" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#23a85a" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.08)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={7} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                  <Tooltip contentStyle={{ background: '#0e2740', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="online" stroke="#23a85a" strokeWidth={2} fill="url(#gOnline)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>📊 ONU authorizations per day</span></div>
            <div style={{ padding: 14 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={authSeries} margin={{ top: 5, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.08)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#0e2740', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="n" fill="rgba(43,127,212,0.78)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>⚡ PON outage</span></div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(224,138,22,0.08)', border: '1px solid rgba(224,138,22,0.2)',
                borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date · probably disconnected (down &gt; 7 days)</span>
                <span><b style={{ color: '#f0b35a', fontSize: 18 }}>{oltsOffline}</b> PON</span>
              </div>
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span><IconServer2 size={14} style={{ verticalAlign: -2 }} /> OLTs</span>
              <NavLink to="/olts" className="more">View all ▸</NavLink></div>
            <div style={{ padding: '6px 14px' }}>
              {olts.length === 0 && <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 13 }}>No OLTs</div>}
              {olts.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px',
                  borderBottom: '1px solid rgba(120,160,200,.08)', fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none',
                    background: o.status === 'online' ? 'var(--green)' : 'var(--text-muted)',
                    boxShadow: o.status === 'online' ? '0 0 7px rgba(35,168,90,.8)' : 'none' }} />
                  <span style={{ flex: 1, color: '#dbe6f1' }}>{o.name || o.host}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{uptimeStr(o)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>ℹ Info</span></div>
            <div style={{ padding: 14 }}>
              <div style={{ maxHeight: 430, overflowY: 'auto' }}>
                {feed.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No recent activity</div>}
                {feed.map((ev, i) => (
                  <div key={ev.id || i} style={{ display: 'flex', gap: 10, padding: '9px 2px',
                    borderBottom: '1px solid rgba(120,160,200,.07)', fontSize: 12.5, color: '#c2d2e2' }}>
                    <div style={{ flex: 'none', width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center',
                      fontSize: 11, marginTop: 1, background: 'rgba(43,127,212,.18)', color: '#7fb6ec' }}>
                      <IconRefresh size={12} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {ev.message || ev.type || 'Event'}
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginTop: 2 }}>
                        <IconClock size={9} style={{ verticalAlign: -1 }} /> {relativeTime(ev.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <NavLink to="/events" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12.5,
                color: '#7fb2e6', background: 'rgba(43,127,212,.1)', border: '1px solid rgba(43,127,212,.25)',
                borderRadius: 7, padding: 8, textDecoration: 'none' }}>View all info</NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
