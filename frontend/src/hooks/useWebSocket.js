import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket, subscribeToAll } from '../services/websocket';
import { useAlertStore } from '../store/alertStore';
import { useOLTStore } from '../store/oltStore';
import { useONTStore } from '../store/ontStore';

const DEMO_TOKEN = 'demo-token';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const addAlert = useAlertStore(s => s.addAlert);
  const removeAlert = useAlertStore(s => s.removeAlert);
  const updateOLT = useOLTStore(s => s.updateOLT);
  const updateONT = useONTStore(s => s.updateONT);
  const socketRef = useRef(null);

  useEffect(() => {
    let socket;
    try {
      socket = getSocket(DEMO_TOKEN);
      socketRef.current = socket;
      subscribeToAll(socket);
    } catch (e) {
      return;
    }

    socket.on('alert:new', (alert) => {
      addAlert(alert);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });

      if (alert.severity === 'CRITICAL') {
        toast.custom((t) => (
          <div
            className={`${t.visible ? 'opacity-100' : 'opacity-0'} transition-opacity flex items-start gap-3 p-4 rounded-lg`}
            style={{ background: '#1a0810', border: '1px solid rgba(255,59,92,0.3)', maxWidth: '380px', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <span style={{ color: '#FF3B5C', fontSize: '18px' }}>⚠</span>
            <div>
              <div style={{ color: '#FF3B5C', fontSize: '11px', fontWeight: 600 }}>{alert.type}</div>
              <div style={{ color: '#E2E8F0', fontSize: '12px', marginTop: '2px' }}>{alert.message}</div>
            </div>
          </div>
        ), { duration: 8000 });
      }
    });

    socket.on('ont:los', ({ ontId, clientName }) => {
      updateONT(ontId, { status: 'LOS' });
      toast.custom((t) => (
        <div
          className={`${t.visible ? 'opacity-100' : 'opacity-0'} transition-opacity flex items-center gap-3 p-3 rounded-lg`}
          style={{ background: '#1a0810', border: '1px solid rgba(255,59,92,0.3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}
        >
          <span style={{ color: '#FF3B5C', fontSize: '16px' }}>●</span>
          <span style={{ color: '#E2E8F0' }}>LOS — <strong style={{ color: '#FF3B5C' }}>{clientName || ontId}</strong></span>
        </div>
      ), { duration: 10000 });
    });

    socket.on('ont:online', ({ ontId }) => {
      updateONT(ontId, { status: 'ONLINE' });
      queryClient.invalidateQueries({ queryKey: ['onts'] });
    });

    socket.on('ont:signal-update', ({ ontId, rx_power, tx_power }) => {
      updateONT(ontId, { rx_power, tx_power });
    });

    socket.on('olt:update', (data) => {
      updateOLT(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['olts'] });
    });

    socket.on('olt:cpu-high', ({ oltId, name, cpu }) => {
      toast.error(`CPU alto en ${name}: ${cpu}%`, { duration: 6000 });
    });

    socket.on('alert:resolved', ({ id }) => {
      removeAlert(id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    socket.on('ztp:new-ont', (ont) => {
      queryClient.invalidateQueries({ queryKey: ['ztp-pending'] });
      toast(`Nuevo ONT detectado: ${ont.serial_number}`, { icon: '📡' });
    });

    socket.on('network:summary', (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      socket.off('alert:new');
      socket.off('ont:los');
      socket.off('ont:online');
      socket.off('ont:signal-update');
      socket.off('olt:update');
      socket.off('olt:cpu-high');
      socket.off('alert:resolved');
      socket.off('ztp:new-ont');
      socket.off('network:summary');
    };
  }, []);

  return socketRef.current;
}
