import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getAttendanceSessions,
  saveAttendanceSession,
  deleteAttendanceSession,
} from '../services/attendance';
import { AttendanceSession } from '../types';

interface UseAttendanceQueryOptions {
  userId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch attendance sessions for a specific class using TanStack Query.
 * Lazy loaded based on active tab and selected class.
 */
export function useAttendanceQuery({
  userId,
  classId,
  enabled = true,
}: UseAttendanceQueryOptions) {
  return useQuery({
    queryKey: queryKeys.attendance(userId || '', classId || ''),
    queryFn: async () => {
      if (!classId) return [];
      return getAttendanceSessions(classId);
    },
    enabled: Boolean(userId && classId && enabled),
  });
}

/**
 * Mutation hooks for saving and deleting attendance sessions.
 * Invalidate cache automatically for the active class.
 */
export function useAttendanceMutations(userId?: string, classId?: string) {
  const queryClient = useQueryClient();

  const invalidate = (targetClassId?: string) => {
    const cId = targetClassId || classId;
    if (userId && cId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(userId, cId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions(userId, cId) });
    }
  };

  const saveMutation = useMutation({
    mutationFn: (session: AttendanceSession) => saveAttendanceSession(session),
    onSuccess: (saved) => {
      invalidate(saved.classId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ sessionId, targetClassId }: { sessionId: string; targetClassId?: string }) =>
      deleteAttendanceSession(sessionId),
    onSuccess: (_, variables) => {
      invalidate(variables.targetClassId);
    },
  });

  return {
    saveSession: saveMutation.mutateAsync,
    deleteSession: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
