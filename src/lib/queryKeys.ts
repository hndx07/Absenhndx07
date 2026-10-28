/**
 * Centralized Query Keys for TanStack Query.
 * MANDATORY PATTERN: Every key is scoped by `userId` to ensure zero cache leakage
 * between different teacher accounts on the same workstation.
 */
export const queryKeys = {
  classes: (userId: string) => ['classes', userId] as const,
  students: (userId: string, classId: string) => ['students', userId, classId] as const,
  sessions: (userId: string, classId: string) => ['sessions', userId, classId] as const,
  grades: (userId: string, classId: string) => ['grades', userId, classId] as const,
  agendas: (userId: string) => ['agendas', userId] as const,
  savings: (userId: string, classId: string) => ['savings', userId, classId] as const,
};
