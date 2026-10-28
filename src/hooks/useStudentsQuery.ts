import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  batchInsertStudents,
} from '../services/students';
import { Student } from '../types';

interface UseStudentsQueryOptions {
  userId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch students for an active class using TanStack Query.
 * Cache is scoped strictly by `userId` and `classId`.
 */
export function useStudentsQuery({
  userId,
  classId,
  enabled = true,
}: UseStudentsQueryOptions) {
  return useQuery({
    queryKey: queryKeys.students(userId || '', classId || ''),
    queryFn: async () => {
      if (!classId) return [];
      return getStudents(classId);
    },
    enabled: Boolean(userId && classId && enabled),
  });
}

/**
 * Mutation hooks for creating, updating, deleting, and batch importing students
 * with automatic query cache invalidation for the target class.
 */
export function useStudentMutations(userId?: string, classId?: string) {
  const queryClient = useQueryClient();

  const invalidateStudents = (targetClassId?: string) => {
    const cId = targetClassId || classId;
    if (userId && cId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.students(userId, cId) });
    }
  };

  const createMutation = useMutation({
    mutationFn: (std: Student) => createStudent(std),
    onSuccess: (saved) => {
      invalidateStudents(saved.classId);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (std: Student) => updateStudent(std),
    onSuccess: (saved) => {
      invalidateStudents(saved.classId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ studentId, targetClassId }: { studentId: string; targetClassId?: string }) =>
      deleteStudent(studentId),
    onSuccess: (_, variables) => {
      invalidateStudents(variables.targetClassId);
    },
  });

  const batchInsertMutation = useMutation({
    mutationFn: (studentsList: Student[]) => batchInsertStudents(studentsList),
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        invalidateStudents(variables[0].classId);
      }
    },
  });

  return {
    createStudent: createMutation.mutateAsync,
    updateStudent: updateMutation.mutateAsync,
    deleteStudent: deleteMutation.mutateAsync,
    batchInsertStudents: batchInsertMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatching: batchInsertMutation.isPending,
  };
}
