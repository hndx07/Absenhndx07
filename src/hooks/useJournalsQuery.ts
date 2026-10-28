import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getTeachingAgendas,
  saveTeachingAgenda,
  deleteTeachingAgenda,
  batchSaveTeachingAgendas,
} from '../services/agendas';
import { TeachingAgenda } from '../types';

interface UseJournalsQueryOptions {
  userId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch teaching journals/agendas using TanStack Query.
 * Lazy loaded when on the agendas or attendance tabs.
 */
export function useJournalsQuery({
  userId,
  classId,
  enabled = true,
}: UseJournalsQueryOptions) {
  return useQuery({
    queryKey: queryKeys.agendas(userId || ''),
    queryFn: async () => {
      return getTeachingAgendas(classId);
    },
    enabled: Boolean(userId && enabled),
  });
}

/**
 * Mutation hooks for saving, deleting, and batch importing teaching journals.
 */
export function useJournalsMutations(userId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.agendas(userId) });
    }
  };

  const saveMutation = useMutation({
    mutationFn: (agenda: TeachingAgenda) => saveTeachingAgenda(agenda),
    onSuccess: () => {
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (agendaId: string) => deleteTeachingAgenda(agendaId),
    onSuccess: () => {
      invalidate();
    },
  });

  const batchSaveMutation = useMutation({
    mutationFn: (agendasList: TeachingAgenda[]) => batchSaveTeachingAgendas(agendasList),
    onSuccess: () => {
      invalidate();
    },
  });

  return {
    saveAgenda: saveMutation.mutateAsync,
    deleteAgenda: deleteMutation.mutateAsync,
    batchSaveAgendas: batchSaveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchSaving: batchSaveMutation.isPending,
  };
}
