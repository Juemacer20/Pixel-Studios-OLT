import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertAPI } from '../services/api';
import { useAlertStore } from '../store/alertStore';
import { useEffect } from 'react';

export function useAlerts(params = {}) {
  const setAlerts = useAlertStore(s => s.setAlerts);
  const query = useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertAPI.list(params).then(r => r.data),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (query.data?.data) {
      const active = query.data.data.filter(a => !a.resolved);
      setAlerts(active);
    }
  }, [query.data]);

  return query;
}

export function useActiveAlerts() {
  return useAlerts({ resolved: false });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  const acknowledge = useAlertStore(s => s.acknowledgeAlert);
  return useMutation({
    mutationFn: (id) => alertAPI.acknowledge(id).then(r => r.data.data),
    onSuccess: (_, id) => {
      acknowledge(id);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  const remove = useAlertStore(s => s.removeAlert);
  return useMutation({
    mutationFn: (id) => alertAPI.resolve(id).then(r => r.data.data),
    onSuccess: (_, id) => {
      remove(id);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
