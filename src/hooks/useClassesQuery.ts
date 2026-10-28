import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getClasses, createClass, updateClass, deleteClass } from '../services/classes';
import { ClassRoom } from '../types';

interface UseClassesQueryOptions {
  userId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch teacher classes using TanStack Query.
 * Cache is scoped strictly by `userId`.
 */
export function useClassesQuery({ userId, enabled = true }: UseClassesQueryOptions) {
  return useQuery({
    queryKey: queryKeys.classes(userId || ''),
    queryFn: async () => {
      return getClasses();
    },
    enabled: Boolean(userId && enabled),
  });
}

/**
 * Mutation hooks for creating, updating, and deleting classes with automatic query cache invalidation.
 */
export function useClassMutations(userId?: string) {
  const queryClient = useQueryClient();

  const invalidateClasses = () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes(userId) });
    }
  };

  const createMutation = useMutation({
    mutationFn: (cls: ClassRoom) => createClass(cls),
    onSuccess: () => {
      invalidateClasses();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (cls: ClassRoom) => updateClass(cls),
    onSuccess: () => {
      invalidateClasses();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (classId: string) => deleteClass(classId),
    onSuccess: () => {
      invalidateClasses();
    },
  });

  return {
    createClass: createMutation.mutateAsync,
    updateClass: updateMutation.mutateAsync,
    deleteClass: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
