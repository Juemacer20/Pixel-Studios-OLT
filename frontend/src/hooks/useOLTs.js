import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oltAPI } from '../services/api';
import { useOLTStore } from '../store/oltStore';
import { useEffect } from 'react';

export function useOLTs(params = {}) {
  const setOLTs = useOLTStore(s => s.setOLTs);
  const query = useQuery({
    queryKey: ['olts', params],
    queryFn: () => oltAPI.list(params).then(r => r.data.data),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (query.data) setOLTs(query.data);
  }, [query.data]);

  return query;
}

export function useOLT(id) {
  return useQuery({
    queryKey: ['olt', id],
    queryFn: () => oltAPI.get(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useOLTStatus(id) {
  return useQuery({
    queryKey: ['olt-status', id],
    queryFn: () => oltAPI.status(id).then(r => r.data.data),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useCreateOLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => oltAPI.create(data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['olts'] }),
  });
}

export function useUpdateOLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => oltAPI.update(id, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['olts'] }),
  });
}

export function useDeleteOLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => oltAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['olts'] }),
  });
}

export function useSendOLTCommand() {
  return useMutation({
    mutationFn: ({ id, cmd }) => oltAPI.command(id, cmd).then(r => r.data.data),
  });
}
