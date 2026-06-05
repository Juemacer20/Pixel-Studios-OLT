import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconInfoCircle } from '@tabler/icons-react';
import api from '../../services/api';
import { oltAPI } from '../../services/api';
import SignalCard from '../../components/graphs/SignalCard';
import OltCard from '../../components/graphs/OltCard';
import PonCard from '../../components/graphs/PonCard';
import GraphModal from '../../components/graphs/GraphModal';

const TABS = ['OLT', 'Uplink', 'PON', 'Traffic', 'Signal'];

function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) nums.push(i);
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', paddingTop: 16 }}>
      {nums.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 32, height: 32, borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            borderColor: n === page ? '#00D4FF' : 'var(--border)',
            background: n === page ? 'rgba(0,212,255,0.12)' : 'transparent',
            color: n === page ? '#00D4FF' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ComingSoonCard({ title }) {
  return (
    <div style={{
      background: 'rgba(14,34,54,0.5)',
      border: '1px solid var(--border)',
      borderRadius: 11,
      padding: '20px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: 0.7,
    }}>
      <IconInfoCircle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coming soon — SNMP traffic polling not yet implemented</div>
      </div>
    </div>
  );
}

function OLTTab({ selectedOlt }) {
  const { data, isLoading } = useQuery({
    queryKey: ['graphs-olt-stats', selectedOlt],
    queryFn: () => api.get('/graphs/olt-stats', { params: { hours: 48, ...(selectedOlt ? { olt_id: selectedOlt } : {}) } }).then(r => r.data?.data ?? r.data),
    retry: 1,
  });

  const items = Array.isArray(data) ? data : [];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>;
  if (!items.length) return <div className="empty-state">No OLT data available</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {items.map(olt => <OltCard key={olt.id} olt={olt} />)}
    </div>
  );
}

function UplinkTab({ olts }) {
  const list = Array.isArray(olts) ? olts : [];
  if (!list.length) return <ComingSoonCard title="Uplink — Coming soon" />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {list.map(olt => <ComingSoonCard key={olt.id} title={`${olt.name} — Uplink`} />)}
    </div>
  );
}

function PONTab({ selectedOlt }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['graphs-pon-signal', selectedOlt, page],
    queryFn: () => api.get('/graphs/pon-signal', { params: { page, limit: 20, hours: 168, ...(selectedOlt ? { olt_id: selectedOlt } : {}) } }).then(r => r.data?.data ?? r.data),
    retry: 1,
  });

  const items = data?.items || [];
  const pages = data?.pages || 0;

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>;
  if (!items.length) return <div className="empty-state">No PON signal data available</div>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {items.map((pon, i) => <PonCard key={`${pon.portKey}-${i}`} pon={pon} />)}
      </div>
      <Pagination page={page} pages={pages} onChange={setPage} />
    </>
  );
}

function TrafficTab({ olts }) {
  const list = Array.isArray(olts) ? olts : [];
  if (!list.length) return <ComingSoonCard title="Traffic — Coming soon" />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {list.map(olt => <ComingSoonCard key={olt.id} title={`${olt.name} — Traffic`} />)}
    </div>
  );
}

function SignalTab({ selectedOlt }) {
  const [page, setPage] = useState(1);
  const [modalOnt, setModalOnt] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['graphs-signal', selectedOlt, page],
    queryFn: () => api.get('/graphs/signal', { params: { page, limit: 20, hours: 168, ...(selectedOlt ? { olt_id: selectedOlt } : {}) } }).then(r => r.data?.data ?? r.data),
    retry: 1,
  });

  const items = data?.items || [];
  const pages = data?.pages || 0;

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>;
  if (!items.length) return <div className="empty-state">No signal data available</div>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {items.map(ont => (
          <SignalCard key={ont.id} ont={ont} onClick={() => setModalOnt(ont)} />
        ))}
      </div>
      <Pagination page={page} pages={pages} onChange={setPage} />
      {modalOnt && <GraphModal ont={modalOnt} onClose={() => setModalOnt(null)} />}
    </>
  );
}

export default function Graphs() {
  const [activeTab, setActiveTab] = useState('Signal');
  const [selectedOlt, setSelectedOlt] = useState('');

  const { data: oltsRaw } = useQuery({
    queryKey: ['olts', {}],
    queryFn: () => oltAPI.list({}).then(r => r.data?.data ?? r.data),
    retry: 1,
  });
  const olts = Array.isArray(oltsRaw) ? oltsRaw : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="page-title">Graphs</span>

        <select
          className="select-base"
          value={selectedOlt}
          onChange={e => setSelectedOlt(e.target.value)}
          style={{ minWidth: 160, fontSize: 12 }}
        >
          <option value="">Any OLT</option>
          {olts.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Graphs for</span>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: '1px solid',
                borderColor: activeTab === tab ? '#00D4FF' : 'var(--border)',
                background: activeTab === tab ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: activeTab === tab ? '#00D4FF' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'OLT'     && <OLTTab selectedOlt={selectedOlt || null} />}
      {activeTab === 'Uplink'  && <UplinkTab olts={olts} />}
      {activeTab === 'PON'     && <PONTab selectedOlt={selectedOlt || null} />}
      {activeTab === 'Traffic' && <TrafficTab olts={olts} />}
      {activeTab === 'Signal'  && <SignalTab selectedOlt={selectedOlt || null} />}
    </div>
  );
}
