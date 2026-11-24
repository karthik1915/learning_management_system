import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { ApiError, getServerApi } from '#/lib/api.server'

export const fetchMeFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<any | null> => {
    const api = getServerApi()

    try {
      const me = await api.get<any | null>('/api/v1/me')
      return me ?? null
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          return null
        }
        throw new Error(`Failed to fetch profile (${err.status})`)
      }

      throw new Error('Network error while fetching profile')
    }
  },
)

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['me'],
    queryFn: () => fetchMeFn(),
    retry: false,
  })
