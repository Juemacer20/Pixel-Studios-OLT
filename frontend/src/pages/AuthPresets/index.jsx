import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconWand, IconPlus, IconSearch, IconCircleCheck } from '@tabler/icons-react';
import { authPresetAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STEPS = [
  { n: 1, title: 'Create Preset', desc: 'Set up conditions and ONU settings' },
  { n: 2, title: 'Set Conditions', desc: 'Define when to apply this preset' },
  { n: 3, title: 'Enable Auto-Auth', desc: 'Turn on auto-authorization' },
  { n: 4, title: 'Done', desc: 'ONUs will be authorized automatically' },
];

export default function AuthPresets() {
  const [search, setSearch] = useState('');
  const { data } = useQuery({
    queryKey: ['auth-presets'],
    queryFn: () => authPresetAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const presets = Array.isArray(data) ? data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <span className="page-title">Authorization Presets</span>
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span>ℹ How it works</span></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: 'rgba(43,127,212,.18)',
                color: '#7fb6ec', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={() => toast('Create Preset with Wizard — próximamente')}><IconWand size={13} /> Create Preset with Wizard</button>
        <button className="btn" onClick={() => toast('Create Preset — próximamente')}><IconPlus size={13} /> Create Preset</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search name, zone, SN…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-base"><option>All OLTs</option></select>
        <select className="select-base"><option>Any ONU type</option></select>
        <select className="select-base"><option>Any PON</option></select>
        <select className="select-base"><option>Any mode</option></select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {presets.length === 0 ? (
          <div className="empty-state">
            <IconCircleCheck size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />
            <div>No presets found</div>
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Create your first authorization preset using the wizard above</div>
          </div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Name</th><th>OLT</th><th>ONU type</th><th>Mode</th><th>Default</th><th style={{ width: 90 }}>Action</th></tr></thead>
            <tbody>{presets.map((p, i) => (
              <tr key={i}><td>{p.name}</td><td>{p.olt || '—'}</td><td>{p.onu_type || '—'}</td><td>{p.mode || '—'}</td><td>{p.is_default ? 'Yes' : 'No'}</td><td /></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
