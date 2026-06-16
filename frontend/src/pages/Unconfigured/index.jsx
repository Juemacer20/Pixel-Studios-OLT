import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IconRefresh, IconX, IconCheck, IconPlugConnected, IconWand, IconHistory, IconPlayerPlay,
  IconSettings, IconToggleLeft, IconToggleRight, IconTrash, IconPlus,
} from '@tabler/icons-react';
import { ontAPI, oltAPI, autoActionAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

/* ── AutoActionsConfigModal ─────────────────────────────────────────────── */
function AutoActionsConfigModal({ open, onClose }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', snPattern: '', ponType: '', isActive: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: presetsRaw, isLoading } = useQuery({
    queryKey: ['auto-action-presets'],
    queryFn: () => autoActionAPI.list().then(r => r.data?.data ?? r.data ?? []),
    enabled: open,
  });
  const presets = Array.isArray(presetsRaw) ? presetsRaw : [];

  const createMut = useMutation({
    mutationFn: () => autoActionAPI.create({ ...form }),
    onSuccess: () => { toast.success('Preset created'); qc.invalidateQueries({ queryKey: ['auto-action-presets'] }); setShowForm(false); setForm({ name: '', description: '', snPattern: '', ponType: '', isActive: true }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to create preset'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => autoActionAPI.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auto-action-presets'] }),
    onError: () => toast.error('Toggle failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => autoActionAPI.delete(id),
    onSuccess: () => { toast.success('Preset deleted'); qc.invalidateQueries({ queryKey: ['auto-action-presets'] }); },
    onError: () => toast.error('Delete failed'),
  });

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 401, width: 560, maxWidth: '96vw', maxHeight: '85vh', overflowY: 'auto',
        background: 'var(--panel-bg)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}><IconSettings size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Configure auto-actions</span>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>
            Auto-action presets define rules that automatically authorize new ONUs when they appear on a PON port. Each preset specifies conditions (OLT, SN pattern, PON type) and authorization settings. Active presets run every time <strong>Run auto-authorize</strong> is executed.
          </p>

          {/* Preset list */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
          ) : presets.length === 0 && !showForm ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No presets. Create one below.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {presets.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6,
                  opacity: p.isActive ? 1 : 0.6,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {p.snPattern && <span className="badge" style={{ fontSize: 10, background: 'rgba(43,127,212,.15)', color: '#7fb6ec' }}>SN: {p.snPattern}</span>}
                      {p.ponType && <span className="badge" style={{ fontSize: 10, background: 'rgba(92,184,92,.12)', color: '#5cb85c' }}>{p.ponType}</span>}
                      <span className="badge" style={{ fontSize: 10, background: p.isActive ? 'rgba(92,184,92,.12)' : 'rgba(150,150,150,.12)', color: p.isActive ? '#5cb85c' : 'var(--text-muted)' }}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <button className="btn-icon" title={p.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleMut.mutate(p.id)} disabled={toggleMut.isPending}>
                    {p.isActive ? <IconToggleRight size={20} style={{ color: '#5cb85c' }} /> : <IconToggleLeft size={20} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button className="btn-icon" title="Delete" onClick={() => { if (window.confirm(`Delete preset "${p.name}"?`)) deleteMut.mutate(p.id); }} disabled={deleteMut.isPending}>
                    <IconTrash size={14} style={{ color: 'var(--red)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create form */}
          {showForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>New preset</div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Name <span style={{ color: 'var(--red)' }}>*</span>
                <input className="input-base" style={{ marginTop: 3 }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Default GPON" />
              </label>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Description
                <input className="input-base" style={{ marginTop: 3 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  SN pattern (regex)
                  <input className="input-base" style={{ marginTop: 3 }} value={form.snPattern} onChange={e => set('snPattern', e.target.value)} placeholder="e.g. ^HWTC" />
                </label>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  PON type
                  <select className="input-base" style={{ marginTop: 3 }} value={form.ponType} onChange={e => set('ponType', e.target.value)}>
                    <option value="">Any</option>
                    <option value="GPON">GPON</option>
                    <option value="EPON">EPON</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                <label htmlFor="isActive" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>Active immediately</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-success" disabled={!form.name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
                  <IconCheck size={13} /> {createMut.isPending ? 'Creating…' : 'Create preset'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowForm(true)}>
              <IconPlus size={13} /> Add preset
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const panelGreen = {
  border: '1px solid #3d8b3d',
  borderRadius: 4, marginBottom: 16, background: 'var(--panel-bg)',
  boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
};
const panelHeading = {
  background: 'linear-gradient(180deg, #3d8b3d 0%, #2d6b2d 100%)',
  color: '#fff', padding: '10px 15px', fontSize: 13, fontWeight: 700,
  borderBottom: '1px solid #2d6b2d', borderRadius: '3px 3px 0 0',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const tableCls = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13,
};
const thCls = {
  padding: '8px 10px', borderBottom: '2px solid #2d6b2d', fontSize: 11,
  fontWeight: 700, textTransform: 'uppercase', color: '#2d6b2d', textAlign: 'left',
  whiteSpace: 'nowrap',
};
const tdCls = {
  padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)',
  verticalAlign: 'middle', fontSize: 12,
};

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function AuthorizeModal({ ont, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const authMut = useMutation({
    mutationFn: () => ontAPI.patch(ont.id, { description: name.trim() }),
    onSuccess: () => {
      toast.success(`ONT ${ont.serial_number} authorized as "${name.trim()}"`);
      onSuccess(ont.id); onClose();
    },
    onError: () => toast.error('Failed to authorize ONT'),
  });

  const handleSubmit = (e) => { e.preventDefault(); if (!name.trim()) return; authMut.mutate(); };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 401, width: 420, maxWidth: '95vw',
        background: 'var(--panel-bg)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Authorize ONT</span>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Serial Number</label>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ont.serial_number}</div></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>OLT</label>
            <div style={{ fontSize: 12 }}>{ont._olt?.name || ont.olt?.name || '—'}</div></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Client Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input ref={nameRef} className="input-base" placeholder="e.g. Juan Garcia" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={!name.trim() || authMut.isPending}>
              <IconCheck size={13} /> {authMut.isPending ? 'Authorizing…' : 'Authorize'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function Unconfigured() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedOLT, setSelectedOLT] = useState('');
  const [modalONT, setModalONT] = useState(null);
  const [showAutoActions, setShowAutoActions] = useState(false);

  const runNowMut = useMutation({
    mutationFn: () => autoActionAPI.runNow(),
    onSuccess: (r) => { const d = r.data?.data || {}; toast.success(`Auto-authorize: ${d.authorized ?? 0} autorizadas${d.dryRun ? ' (dry-run)' : ''}`); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Run failed'),
  });

  const { data: savedResp } = useQuery({ queryKey: ['saved-onus'], queryFn: () => ontAPI.savedList().then(r => r.data?.data ?? []).catch(() => []) });
  const saved = Array.isArray(savedResp) ? savedResp : [];
  const saveMut = useMutation({
    mutationFn: (ont) => ontAPI.savedAdd({ serial_number: ont.serial_number, name: ont.description, olt_id: ont.olt?.id, olt_name: ont.olt?.name }),
    onSuccess: () => { toast.success('ONU saved'); queryClient.invalidateQueries({ queryKey: ['saved-onus'] }); },
    onError: () => toast.error('Save failed'),
  });
  const unsaveMut = useMutation({
    mutationFn: (id) => ontAPI.savedDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-onus'] }),
  });

  const { data: resp, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['onts-unconfigured'],
    queryFn: () => ontAPI.unconfigured().then(r => r.data?.data || { groups: [], total: 0 }),
    refetchInterval: 60000, retry: 1,
  });

  const { data: oltsResp } = useQuery({
    queryKey: ['olts-list'],
    queryFn: () => oltAPI.list().then(r => r.data?.data || r.data?.results || r.data || []).catch(() => []),
    retry: 1,
  });

  const allGroups = resp?.groups || [];
  const total = resp?.total || 0;
  const olts = Array.isArray(oltsResp) ? oltsResp : allGroups.map(g => g.olt).filter(Boolean);

  const visibleGroups = useMemo(() => {
    if (!selectedOLT) return allGroups;
    return allGroups.filter(g => String(g.olt?.id) === selectedOLT);
  }, [allGroups, selectedOLT]);

  const handleAuthorizeSuccess = useCallback((ontId) => {
    queryClient.setQueryData(['onts-unconfigured'], (old) => {
      if (!old) return old;
      const groups = (old.data?.groups || old.groups || [])
        .map(g => ({ ...g, onts: g.onts.filter(o => o.id !== ontId) }))
        .filter(g => g.onts.length > 0);
      const total = groups.reduce((acc, g) => acc + g.onts.length, 0);
      return old.data ? { ...old, data: { groups, total } } : { groups, total };
    });
  }, [queryClient]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">Unconfigured ONTs</span>
          {total > 0 ? (
            <span style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{total} pendientes</span>
          ) : (
            <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>Sin pendientes</span>
          )}
          {isFetching && !isLoading && <span className="polling-dot" />}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input-base" style={{ width: 180, fontSize: 12 }} value={selectedOLT} onChange={e => setSelectedOLT(e.target.value)}>
            <option value="">All OLTs</option>
            {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button className="btn" onClick={() => refetch()} disabled={isFetching}><IconRefresh size={13} /> Refresh</button>
          <button className="btn" onClick={() => setShowAutoActions(true)}><IconSettings size={13} /> Configure actions</button>
          <button className="btn" onClick={() => navigate('/reports/tasks')}><IconHistory size={13} /> Task history</button>
          <button className="btn" onClick={() => navigate('/auth-presets')}><IconWand size={13} /> Authorization Presets</button>
          <button className="btn btn-success" onClick={() => runNowMut.mutate()} disabled={runNowMut.isPending}>
            <IconPlayerPlay size={13} /> {runNowMut.isPending ? 'Running…' : 'Run auto-authorize'}
          </button>
        </div>
      </div>

      {/* Loading / Empty */}
      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24, margin: '0 auto 10px', display: 'block' }} />Scanning for unconfigured ONUs…</div>
      ) : visibleGroups.length === 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 15px', background: '#3d8b3d', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            <IconPlugConnected size={14} style={{ marginRight: 6 }} />No unconfigured ONTs
          </div>
          <div className="empty-state" style={{ padding: 30 }}>
            <IconPlugConnected size={36} style={{ margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>All ONTs are configured</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No ONTs pending authorization.</div>
          </div>
        </div>
      ) : (
        /* ── Panels by OLT (SmartOLT style) ── */
        visibleGroups.map(group => (
          <div key={group.olt?.id || 'unknown'} style={panelGreen}>
            <div style={panelHeading}>
              <span><IconPlugConnected size={14} style={{ marginRight: 6 }} />{group.olt?.name || 'Unknown OLT'} <span style={{ fontSize: 11, opacity: 0.8 }}>({group.onts.length})</span></span>
              <span style={{ fontSize: 11, opacity: 0.85, cursor: 'pointer' }} onClick={() => navigate(`/olts/${group.olt?.id}/configured`)}>View all →</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableCls}>
                <thead>
                  <tr>
                    <th style={thCls}>PON type</th>
                    <th style={thCls}>Board</th>
                    <th style={thCls}>Port</th>
                    <th style={thCls}>PON Description</th>
                    <th style={thCls}>SN</th>
                    <th style={thCls}>Type</th>
                    <th style={{ ...thCls, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.onts.map((ont, i) => (
                    <tr key={ont.id}
                      style={{ background: i % 2 === 0 ? 'var(--panel-bg)' : 'rgba(127,150,180,0.04)' }}>
                      <td style={tdCls}><span className="label label-green" style={{ fontSize: 10 }}>GPON</span></td>
                      <td style={tdCls}>{ont.board ?? ont.description?.match(/^GPON0\/(\d+)/)?.[1] ?? '0'}</td>
                      <td style={tdCls}>{ont.port ?? ont.description?.match(/^GPON0\/\d+:(\d+)/)?.[1] ?? '—'}</td>
                      <td style={tdCls}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ont.description || '—'}</span></td>
                      <td style={tdCls}><span className="mono" style={{ fontSize: 11 }}>{ont.serial_number}</span></td>
                      <td style={tdCls}>{ont.model || '—'}</td>
                      <td style={{ ...tdCls, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-success btn-xs" style={{ padding: '2px 10px', fontSize: 11 }}
                          onClick={() => setModalONT(ont)}>
                          <IconCheck size={11} /> Authorize
                        </button>
                        <button className="btn btn-xs" style={{ padding: '2px 6px', fontSize: 10, marginLeft: 4, color: 'var(--text-muted)' }}
                          onClick={() => saveMut.mutate(ont)} title="Add for later authorization">+</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ── Saved ONUs ── */}
      {saved.length > 0 && (
        <div style={panelGreen}>
          <div style={panelHeading}><span>★ Saved ONUs</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableCls}>
              <thead><tr><th style={thCls}>Name</th><th style={thCls}>SN</th><th style={thCls}>OLT</th><th style={{ ...thCls, textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {saved.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? 'var(--panel-bg)' : 'rgba(127,150,180,0.04)' }}>
                    <td style={tdCls}>{s.name || '—'}</td>
                    <td style={{ ...tdCls, fontFamily: 'monospace', fontSize: 11 }}>{s.serial_number}</td>
                    <td style={tdCls}>{s.olt_name || '—'}</td>
                    <td style={{ ...tdCls, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-success btn-xs" style={{ padding: '2px 10px', fontSize: 11 }}
                        onClick={() => navigate(`/onu/authorize?sn=${encodeURIComponent(s.serial_number)}`)}>View</button>
                      <button className="btn btn-xs" style={{ padding: '2px 6px', fontSize: 10, marginLeft: 4, color: 'var(--red)' }}
                        onClick={() => unsaveMut.mutate(s.id)}><IconX size={11} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalONT && (
        <AuthorizeModal
          ont={modalONT}
          onClose={() => setModalONT(null)}
          onSuccess={handleAuthorizeSuccess}
        />
      )}

      <AutoActionsConfigModal
        open={showAutoActions}
        onClose={() => setShowAutoActions(false)}
      />
    </div>
  );
}
