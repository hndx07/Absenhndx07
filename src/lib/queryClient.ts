import { QueryClient } from '@tanstack/react-query';

/**
 * Creates and configures a TanStack QueryClient with reasonable defaults for
 * educational server state caching:
 * - staleTime: 2 minutes (prevents spamming Supabase while navigating tabs)
 * - refetchOnWindowFocus: false (prevents UI jumps when switching browser tabs)
 * - retry: 1 (fast failover with single retry on transient network glitch)
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

// Global query client instance for external cache invalidation & sign-out clearing
export const queryClient = createQueryClient();
