import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vsolAPI } from '../../services/api';
import { IconArrowLeft, IconRefresh, IconFileText } from '@tabler/icons-react';

const PROFILE_TYPES = [
  { key: 'line', label: 'Line Profiles', icon: '🔵' },
  { key: 'service', label: 'Service Profiles', icon: '🟢' },
  { key: 'alarm', label: 'Alarm Profiles', icon: '🔴' },
  { key: 'traffic', label: 'Traffic Profiles', icon: '🟠' },
];

export default function Profiles() {
  const { id } = useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'profiles'],
    queryFn: () => vsolAPI.profiles(id).then(r => r.data?.data ?? r.data),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/olts/${id}/vsol`} className="btn"><IconArrowLeft size={14} /> Back</Link>
          <span className="page-title">VSOL Profiles</span>
        </div>
        <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh from OLT</button>
      </div>

      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading profiles from OLT…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {PROFILE_TYPES.map(({ key, label, icon }) => {
            const items = data?.[key] || [];
            return (
              <div className="card" key={key} style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="sol-card-h">
                  <span>{icon} {label}</span>
                  <span className="badge">{items.length}</span>
                </div>
                <div style={{ padding: 14, flex: 1 }}>
                  {items.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                      <IconFileText size={24} style={{ opacity: 0.3, marginBottom: 8, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                      No {key} profiles
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map((p, i) => (
                        <span
                          key={i}
                          className="badge"
                          style={{
                            fontSize: 12, padding: '5px 12px',
                            background: 'rgba(127,150,180,0.08)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                          }}
                        >{typeof p === 'string' ? p : p.name || JSON.stringify(p).slice(0, 40)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
