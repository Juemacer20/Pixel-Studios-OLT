import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ztpAPI } from '../../services/api';
import PendingONTs from '../../components/ztp/PendingONTs';
import ProfileManager from '../../components/ztp/ProfileManager';
import ZTPDrawer from '../../components/ztp/ZTPDrawer';
import { IconWifi, IconCheck, IconClock } from '@tabler/icons-react';

const TABS = ['Pendientes', 'Perfiles'];

export default function ZTP() {
  const [tab, setTab] = useState('Pendientes');
  const [authorizing, setAuthorizing] = useState(null);

  const { data: pending = [] } = useQuery({
    queryKey: ['ztp-pending'],
    queryFn: () => ztpAPI.pending().then(r => r.data.data),
    refetchInterval: 20000,
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-200">Zero Touch Provisioning</h1>
          {pending.length > 0 && (
            <span
              className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: '#FF6B3522', border: '1px solid #FF6B3544', color: '#FF6B35' }}
            >
              <IconClock size={9} />
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2 text-xs font-mono text-gray-500">
          <span>
            Total autorizado:{' '}
            <span style={{ color: '#00FF94' }}>
              —
            </span>
          </span>
        </div>
      </div>

      {/* Alert banner when ONTs are pending */}
      {pending.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs"
          style={{ background: '#FF6B3510', border: '1px solid #FF6B3530' }}
        >
          <IconWifi size={14} style={{ color: '#FF6B35' }} className="flex-shrink-0" />
          <span style={{ color: '#FF6B35' }}>
            {pending.length} ONT{pending.length !== 1 ? 's' : ''} detectado{pending.length !== 1 ? 's' : ''} esperando autorización.
            Revisá y asigná un perfil para provisionar automáticamente.
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid #1E2D45', paddingBottom: '1px' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-xs font-medium transition-colors relative"
            style={{ color: tab === t ? '#00D4FF' : '#6B7280' }}
          >
            {t}
            {t === 'Pendientes' && pending.length > 0 && (
              <span
                className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-mono"
                style={{ background: '#FF6B35', color: '#fff' }}
              >
                {pending.length}
              </span>
            )}
            {tab === t && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: '#00D4FF' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'Pendientes' && (
          <div className="flex flex-col gap-3">
            {pending.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 rounded-lg text-center"
                style={{ border: '1px dashed #1E2D45' }}
              >
                <IconCheck size={32} className="mb-3" style={{ color: '#00FF94' }} />
                <div className="text-sm text-gray-400 font-medium">Sin ONTs pendientes</div>
                <div className="text-xs text-gray-600 mt-1">
                  Cuando se detecte un nuevo ONT, aparecerá aquí para autorización.
                </div>
              </div>
            ) : (
              <PendingONTs onAuthorize={setAuthorizing} />
            )}
          </div>
        )}

        {tab === 'Perfiles' && (
          <div className="max-w-2xl">
            <ProfileManager />
          </div>
        )}
      </div>

      {/* Authorization drawer */}
      <ZTPDrawer ont={authorizing} onClose={() => setAuthorizing(null)} />
    </div>
  );
}
