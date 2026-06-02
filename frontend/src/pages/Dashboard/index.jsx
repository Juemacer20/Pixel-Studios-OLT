import React, { useState } from 'react';
import KPICards from '../../components/dashboard/KPICards';
import OLTTable from '../../components/dashboard/OLTTable';
import AlertsPanel from '../../components/dashboard/AlertsPanel';
import ONTTable from '../../components/dashboard/ONTTable';
import FiberTree from '../../components/dashboard/FiberTree';
import Drawer from '../../components/shared/Drawer';
import SignalChart from '../../components/signal/SignalChart';
import { useAlerts } from '../../hooks/useAlerts';

export default function Dashboard() {
  useAlerts({ resolved: false });
  const [selectedONT, setSelectedONT] = useState(null);
  const [selectedOLT, setSelectedOLT] = useState(null);

  return (
    <div className="flex flex-col gap-4 h-full">
      <KPICards />

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: OLT table + Fiber Tree */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <OLTTable onSelect={setSelectedOLT} />
          </div>
          <FiberTree onSelectONT={setSelectedONT} />
        </div>

        {/* Center: ONT table */}
        <div className="col-span-5 min-h-0 overflow-hidden">
          <ONTTable onSelect={setSelectedONT} />
        </div>

        {/* Right: Alerts panel */}
        <div className="col-span-4 min-h-0">
          <AlertsPanel />
        </div>
      </div>

      {/* ONT Detail Drawer */}
      <Drawer open={!!selectedONT} onClose={() => setSelectedONT(null)} title={`ONT — ${selectedONT?.serial_number || ''}`} width={520}>
        {selectedONT && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Serial', selectedONT.serial_number],
                ['Estado', selectedONT.status],
                ['OLT', selectedONT.olt?.name],
                ['Cliente', selectedONT.client?.name || '—'],
                ['RX Power', selectedONT.rx_power != null ? `${selectedONT.rx_power} dBm` : '—'],
                ['TX Power', selectedONT.tx_power != null ? `${selectedONT.tx_power} dBm` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded p-2" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
                  <div className="text-[10px] text-gray-600 mb-0.5">{k}</div>
                  <div className="font-mono text-gray-200">{v}</div>
                </div>
              ))}
            </div>
            <SignalChart ontId={selectedONT.id} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
