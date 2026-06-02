import React, { useState } from 'react';
import { IconSearch, IconRefresh, IconBell } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';

export default function Topbar() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();
  const alertCount = useAlertStore(s => s.alertCount);
  const criticalCount = useAlertStore(s => s.criticalCount);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="flex items-center gap-4 px-4 py-2.5 border-b" style={{ background: '#111827', borderColor: '#1E2D45', minHeight: '48px' }}>
      <div className="flex items-center gap-2 flex-1 max-w-sm">
        <div className="relative w-full">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar ONT, cliente, IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md outline-none"
            style={{ background: '#1F2D44', border: '1px solid #1E2D45', color: '#E2E8F0' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <IconRefresh size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>

        <div className="relative">
          <button className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <IconBell size={15} />
          </button>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-mono"
              style={{ background: criticalCount > 0 ? '#FF3B5C' : '#FF6B35', color: '#fff' }}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </div>

        <div className="text-[10px] font-mono text-gray-600 pl-2 border-l border-gray-800">
          {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  );
}
