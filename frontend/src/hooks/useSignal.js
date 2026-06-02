import { useQuery } from '@tanstack/react-query';
import { ontAPI } from '../services/api';

export function useSignalHistory(ontId, range = '24h') {
  return useQuery({
    queryKey: ['signal-history', ontId, range],
    queryFn: () => ontAPI.signalHistory(ontId, range).then(r => r.data.data),
    enabled: !!ontId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCurrentSignal(ontId) {
  return useQuery({
    queryKey: ['signal-current', ontId],
    queryFn: () => ontAPI.signal(ontId).then(r => r.data.data),
    enabled: !!ontId,
    refetchInterval: 30000,
  });
}
