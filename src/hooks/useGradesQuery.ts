import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getStudentGrades,
  saveStudentGrade,
  getGradeColumns,
  saveGradeColumns,
} from '../services/grades';
import { StudentGrade, GradeColumn } from '../types';

interface UseGradesQueryOptions {
  userId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch student grades for a specific class using TanStack Query.
 * Lazy loaded based on active tab and selected class.
 */
export function useGradesQuery({
  userId,
  classId,
  enabled = true,
}: UseGradesQueryOptions) {
  return useQuery({
    queryKey: queryKeys.grades(userId || '', classId || ''),
    queryFn: async () => {
      if (!classId) return [];
      return getStudentGrades(classId);
    },
    enabled: Boolean(userId && classId && enabled),
  });
}

/**
 * Hook to fetch grade column configurations for a class.
 */
export function useGradeColumnsQuery({
  userId,
  classId,
  enabled = true,
}: UseGradesQueryOptions) {
  return useQuery({
    queryKey: queryKeys.gradeColumns(userId || '', classId || ''),
    queryFn: async () => {
      if (!classId) return [];
      return getGradeColumns(classId);
    },
    enabled: Boolean(userId && classId && enabled),
  });
}

/**
 * Mutation hooks for updating grades and grade column definitions.
 */
export function useGradesMutations(userId?: string, classId?: string) {
  const queryClient = useQueryClient();

  const invalidateGrades = (targetClassId?: string) => {
    const cId = targetClassId || classId;
    if (userId && cId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.grades(userId, cId) });
    }
  };

  const invalidateColumns = (targetClassId?: string) => {
    const cId = targetClassId || classId;
    if (userId && cId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.gradeColumns(userId, cId) });
    }
  };

  const saveGradeMutation = useMutation({
    mutationFn: (grade: StudentGrade) => saveStudentGrade(grade),
    onSuccess: (saved) => {
      invalidateGrades(saved.classId);
    },
  });

  const saveColumnsMutation = useMutation({
    mutationFn: ({ columns, targetClassId }: { columns: GradeColumn[]; targetClassId?: string }) =>
      saveGradeColumns(columns, targetClassId || classId),
    onSuccess: (_, variables) => {
      invalidateColumns(variables.targetClassId);
    },
  });

  return {
    saveGrade: saveGradeMutation.mutateAsync,
    saveGradeColumns: saveColumnsMutation.mutateAsync,
    isSavingGrade: saveGradeMutation.isPending,
    isSavingColumns: saveColumnsMutation.isPending,
  };
}
