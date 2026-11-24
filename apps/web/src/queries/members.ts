// apps/web/src/queries/members.ts
import type { Member } from '@lms/types/users'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { clientFetch } from '#/lib/api.client'

export interface MembersQueryParams {
  q?: string
  status?: string
  role?: string
  page?: number
  limit?: number
}

export interface MembersListResponse {
  data: Member[]
  total: number
  page: number
  limit: number
}

function normalizeMembersParams(params: MembersQueryParams = {}) {
  return {
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
    role: params.role || undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  }
}

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: MembersQueryParams = {}) =>
    [...memberKeys.lists(), normalizeMembersParams(params)] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (memberId: string) => [...memberKeys.details(), memberId] as const,
}

export const memberQueries = {
  list: (params: MembersQueryParams = {}) => {
    const normalized = normalizeMembersParams(params)

    return queryOptions({
      queryKey: memberKeys.list(normalized),
      queryFn: () =>
        clientFetch<MembersListResponse>('/api/v1/members', {
          query: normalized,
        }),
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    })
  },

  detail: (memberId: string) =>
    queryOptions({
      queryKey: memberKeys.detail(memberId),
      queryFn: () => clientFetch<Member>(`/api/v1/members/${memberId}`),
      enabled: Boolean(memberId),
      staleTime: 30_000,
    }),
}
