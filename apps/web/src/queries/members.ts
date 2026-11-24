// apps/web/src/queries/members.ts
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { clientFetch } from '#/lib/api.client'

export interface MembersQueryParams {
  q?: string
  status?: string
  role?: string
  page?: number
  limit?: number
}

export interface MemberItem {
  id: string
  name?: string | null
  email: string
  role?: string
  status?: string
  createdAt?: string
}

export interface MembersListResponse {
  items: MemberItem[]
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

export const membersListQueryOptions = (params: MembersQueryParams = {}) => {
  const normalized = normalizeMembersParams(params)

  return queryOptions({
    queryKey: ['members', 'list', normalized],
    queryFn: () =>
      clientFetch<MembersListResponse>('/api/v1/members', {
        query: normalized,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useMembers(params: MembersQueryParams = {}) {
  return useQuery(membersListQueryOptions(params))
}
