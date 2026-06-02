import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ontAPI } from '../services/api';
import { useONTStore } from '../store/ontStore';
import { useEffect } from 'react';

export function useONTs(params = {}) {
  const setONTs = useONTStore(s => s.setONTs);
  const query = useQuery({
    queryKey: ['onts', params],
    queryFn: () => ontAPI.list(params).then(r => r.data),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (query.data?.data) setONTs(query.data.data);
  }, [query.data]);

  return query;
}

export function useONT(id) {
  return useQuery({
    queryKey: ['ont', id],
    queryFn: () => ontAPI.get(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useRebootONT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => ontAPI.reboot(id).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onts'] }),
  });
}

export function useUpdateONTLocation() {
  return useMutation({
    mutationFn: ({ id, latitude, longitude }) => ontAPI.updateLocation(id, latitude, longitude),
  });
}

export function useDHCPLeases(ontId) {
  return useQuery({
    queryKey: ['dhcp-leases', ontId],
    queryFn: () => ontAPI.dhcpLeases(ontId).then(r => r.data.data),
    enabled: !!ontId,
    refetchInterval: 60000,
  });
}
