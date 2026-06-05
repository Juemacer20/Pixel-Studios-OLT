import React, { useMemo, useState } from 'react';
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
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
function fmt(n) { return n == null ? '—' : Number(n).toLocaleString('en-US'); }
function uptimeStr(o) {
  return o.uptime || o.uptime_str || (o.uptime_seconds
    ? `${Math.floor(o.uptime_seconds / 86400)}d ${new Date(o.uptime_seconds * 1000).toISOString().substr(11, 8)}`
    : '—');
}
function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return ''; } }

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

const NET_TABS = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

// ── dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  useAlerts({ resolved: false });
  const [netTab, setNetTab] = useState('Daily');

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

  const { data: outage } = useQuery({
    queryKey: ['dashboard', 'pon-outage'],
    queryFn: () => dashboardAPI.ponOutage().then(r => r.data?.data ?? r.data).catch(() => ({ rows: [], totalPons: 0, totalSubs: 0 })),
    refetchInterval: 60_000, retry: 1,
  });
  const pon = outage || { rows: [], totalPons: 0, totalSubs: 0 };

  const activeAlerts = useAlertStore(s => s.activeAlerts);
  const feed = useMemo(() => activeAlerts.slice(0, 12), [activeAlerts]);

  const online   = d.onlineONTs ?? 0;
  const total    = d.totalAuthorized ?? d.totalONTs ?? 0;
  const waiting  = d.waiting ?? d.ztpPending ?? 0;
  const wb       = d.waitingBreakdown || { d: 0, resync: 0, new: waiting };
  const offline  = d.offlineONTs ?? 0;
  const ob       = d.offlineBreakdown || { pwrfail: 0, los: d.losONTs ?? 0, na: 0 };
  const low      = d.lowSignals ?? 0;
  const lb       = d.lowSignalsBreakdown || { warning: 0, critical: 0 };

  const netSeries  = useMemo(() => buildNetSeries(online), [online, netTab]);
  const authSeries = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    d: `${i + 1}`, n: Math.round(20 + Math.random() * 70),
  })), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Stat boxes ── */}
      <div className="sol-stats">
        <StatBox to="/onu/unconfigured" cls="sol-s-blue" Icon={IconWand} num={fmt(waiting)} label="Waiting authorization"
          foot={[`D: ${fmt(wb.d)}`, `Resync: ${fmt(wb.resync)}`, `New: ${fmt(wb.new)}`]} />
        <StatBox to="/onts" cls="sol-s-green" Icon={IconCircleCheck} num={fmt(online)} label="Online"
          foot={[`Total authorized: ${fmt(total)}`]} />
        <StatBox to="/onts" cls="sol-s-slate" Icon={IconX} num={fmt(offline)} label="Total offline"
          foot={[`PwrFail: ${fmt(ob.pwrfail)}`, `LoS: ${fmt(ob.los)}`, `N/A: ${fmt(ob.na)}`]} />
        <StatBox to="/diagnostics" cls="sol-s-orange" Icon={IconAlertTriangle} num={fmt(low)} label="Low signals"
          foot={[`Warning: ${fmt(lb.warning)}`, `Critical: ${fmt(lb.critical)}`]} />
      </div>

      {/* Information valid at HH:MM */}
      <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--text-muted)', marginTop: -8 }}>
        Information valid at {hhmm(d.validAt || new Date().toISOString())}
      </div>

      {/* ── Row: network status + OLTs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Network status */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h">
              <span>📊 Network status</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {NET_TABS.map(t => (
                  <button key={t} onClick={() => setNetTab(t)} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', border: '1px solid',
                    borderColor: netTab === t ? 'var(--accent)' : 'transparent',
                    background: netTab === t ? 'rgba(43,127,212,.18)' : 'transparent',
                    color: netTab === t ? '#7fb6ec' : 'var(--text-muted)', fontFamily: 'inherit',
                  }}>{t}</button>
                ))}
              </span>
            </div>
            <div style={{ padding: 14 }}>
              <ResponsiveContainer width="100%" height={200}>
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
              {/* leyenda */}
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: 'var(--text-muted)', justifyContent: 'center' }}>
                {[['#23a85a', 'Online'], ['#e08a16', 'Power fail'], ['#e0504f', 'LoS'], ['#5a6b7d', 'N/A']].map(([c, l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} /> {l}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ONU authorizations per day */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>📊 ONU authorizations per day</span></div>
            <div style={{ padding: 14 }}>
              <ResponsiveContainer width="100%" height={190}>
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

          {/* PON outage — tabla real */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span>⚡ PON outage</span></div>
            <div style={{ padding: 14 }}>
              {pon.rows.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No PON outages</div>
              ) : (
                <table className="table-base">
                  <thead><tr><th>OLT</th><th style={{ textAlign: 'center' }}>PONs</th><th style={{ textAlign: 'center' }}>Subscribers</th><th>Since</th></tr></thead>
                  <tbody>
                    {pon.rows.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td>{r.olt}</td>
                        <td style={{ textAlign: 'center' }}>{r.pons}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge badge-orange">{r.subscribers}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.since ? relativeTime(r.since) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)',
                background: 'rgba(224,138,22,0.08)', border: '1px solid rgba(224,138,22,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                Probably disconnected (down &gt; 7 days) → <b style={{ color: '#f0b35a' }}>{pon.totalPons}</b> PON / <b style={{ color: '#f0b35a' }}>{pon.totalSubs}</b> Subscribers
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
                    background: (o.status || '').toUpperCase() === 'ONLINE' ? 'var(--green)' : 'var(--text-muted)',
                    boxShadow: (o.status || '').toUpperCase() === 'ONLINE' ? '0 0 7px rgba(35,168,90,.8)' : 'none' }} />
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
