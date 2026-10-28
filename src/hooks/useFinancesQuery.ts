import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getSavingTransactions,
  saveSavingTransaction,
  deleteSavingTransaction,
} from '../services/savings';
import { SavingTransaction } from '../types';

interface UseFinancesQueryOptions {
  userId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch finance/savings transactions using TanStack Query.
 * Lazy loaded when on the savings or statistics tabs.
 */
export function useFinancesQuery({
  userId,
  classId,
  enabled = true,
}: UseFinancesQueryOptions) {
  return useQuery({
    queryKey: queryKeys.savings(userId || '', classId || ''),
    queryFn: async () => {
      if (!classId) return [];
      return getSavingTransactions(classId);
    },
    enabled: Boolean(userId && classId && enabled),
  });
}

/**
 * Mutation hooks for saving and deleting financial / savings transactions.
 */
export function useFinancesMutations(userId?: string, classId?: string) {
  const queryClient = useQueryClient();

  const invalidate = (targetClassId?: string) => {
    const cId = targetClassId || classId;
    if (userId && cId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings(userId, cId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.finances(userId, cId) });
    }
  };

  const saveMutation = useMutation({
    mutationFn: (tx: SavingTransaction) => saveSavingTransaction(tx),
    onSuccess: (saved) => {
      invalidate(saved.classId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ txId, targetClassId }: { txId: string; targetClassId?: string }) =>
      deleteSavingTransaction(txId),
    onSuccess: (_, variables) => {
      invalidate(variables.targetClassId);
    },
  });

  return {
    saveTransaction: saveMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
