import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getTeacherProfile, createOrUpdateTeacherProfile } from '../services/classes';
import { TeacherProfile } from '../types';

interface UseTeacherProfileQueryOptions {
  userId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch and cache teacher profile using TanStack Query.
 */
export function useTeacherProfileQuery({
  userId,
  enabled = true,
}: UseTeacherProfileQueryOptions) {
  return useQuery({
    queryKey: queryKeys.profile(userId || ''),
    queryFn: async () => {
      const profile = await getTeacherProfile(false);
      return profile;
    },
    enabled: Boolean(userId && enabled),
  });
}

/**
 * Mutation hook for updating teacher profile with cache invalidation.
 */
export function useTeacherProfileMutation(userId?: string) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (profile: Partial<TeacherProfile>) => createOrUpdateTeacherProfile(profile),
    onSuccess: (updated) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        queryClient.setQueryData(queryKeys.profile(userId), updated);
      }
    },
  });

  return {
    saveProfile: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
  };
}
