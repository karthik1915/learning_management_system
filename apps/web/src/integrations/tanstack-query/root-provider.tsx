import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep SSR-fetched data fresh for 30s so client hydration doesn't immediately refetch
        staleTime: 30 * 1000,
      },
    },
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
