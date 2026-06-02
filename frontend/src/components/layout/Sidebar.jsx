import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  IconDashboard, IconRouter, IconAntenna, IconBell, IconUsers,
  IconMap, IconDeviceFloppy, IconSettings, IconChevronLeft, IconChevronRight,
  IconAlertTriangle, IconWifi
} from '@tabler/icons-react';
import { useUIStore } from '../../store/uiStore';
import { useAlertStore } from '../../store/alertStore';
import { useONTStore } from '../../store/ontStore';

const NAV = [
  {
    label: 'MONITOREO',
    items: [
      { to: '/dashboard', icon: IconDashboard, label: 'Dashboard' },
      { to: '/olts', icon: IconRouter, label: 'OLTs' },
      { to: '/onts', icon: IconAntenna, label: 'ONTs' },
      { to: '/alerts', icon: IconBell, label: 'Alertas', badge: 'alerts' },
      { to: '/map', icon: IconMap, label: 'Mapa' },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { to: '/clients', icon: IconUsers, label: 'Clientes' },
      { to: '/tr069', icon: IconDeviceFloppy, label: 'TR-069' },
      { to: '/ztp', icon: IconWifi, label: 'ZTP', badge: 'ztp' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/notifications', icon: IconSettings, label: 'Notificaciones' },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const toggle = useUIStore(s => s.toggleSidebar);
  const alertCount = useAlertStore(s => s.alertCount);
  const pendingZTP = useONTStore(s => s.pendingZTP.length);
  const location = useLocation();

  const getBadge = (key) => {
    if (key === 'alerts' && alertCount > 0) return alertCount;
    if (key === 'ztp' && pendingZTP > 0) return pendingZTP;
    return null;
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? '52px' : '220px',
        background: '#111827',
        borderRight: '1px solid #1E2D45',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-[#1E2D45]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
          style={{ background: 'linear-gradient(135deg, #00D4FF, #0066AA)', color: '#0A0E1A' }}>
          PS
        </div>
        {!collapsed && (
          <div>
            <div className="text-xs font-semibold text-white leading-tight">Pixel Studios</div>
            <div className="text-[10px] text-gray-500 font-mono">OLT Manager</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden">
        {NAV.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-1 text-[9px] font-semibold tracking-widest text-gray-600">{section.label}</div>
            )}
            {section.items.map(({ to, icon: Icon, label, badge }) => {
              const badgeVal = badge ? getBadge(badge) : null;
              const isActive = location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-3 py-2 mx-1 rounded-md transition-all duration-150 relative group"
                  style={{
                    color: isActive ? '#00D4FF' : '#9CA3AF',
                    background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid #00D4FF' : '2px solid transparent',
                  }}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm flex-1 whitespace-nowrap">{label}</span>
                  )}
                  {badgeVal && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                      style={{ background: '#FF3B5C', color: '#fff', minWidth: '18px', textAlign: 'center' }}>
                      {badgeVal > 99 ? '99+' : badgeVal}
                    </span>
                  )}
                  {collapsed && (
                    <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-700 z-50">
                      {label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User + Toggle */}
      <div className="border-t border-[#1E2D45] p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-cyan-900 flex items-center justify-center text-xs text-cyan-400">A</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 truncate">admin</div>
              <div className="text-[10px] text-gray-600 truncate">admin@pixel-studios.com</div>
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
