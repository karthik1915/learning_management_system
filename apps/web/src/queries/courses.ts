import { queryOptions } from '@tanstack/react-query'
import { clientFetch, type QueryParamValue } from '@/lib/api.client'

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type CourseSortBy =
  'title' | 'status' | 'createdAt' | 'updatedAt' | 'publishedAt'
export type SortOrder = 'asc' | 'desc'

export type CourseListParams = Record<string, string | undefined>

export interface CourseInstructorSummary {
  membershipId: string
  displayName?: string | null
  avatarUrl?: string | null
  isPrimary: boolean
  canEdit: boolean
}

export interface CourseListItem {
  id: string
  slug: string
  title: string
  summary: string | null
  level: string | null
  status: CourseStatus
  isSequentialUnlock: boolean
  estimatedMinutes: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  lessonCount: number
  enrolledCount: number
  instructors: CourseInstructorSummary[]
}

export interface CourseListResponse {
  items: CourseListItem[]
  total: number
  page: number
  limit: number
}

export interface CourseLessonBlockOutline {
  id: string
  blockType: string
  sortOrder: number
  title: string | null
  durationSeconds: number | null
  isRequired: boolean
}

export interface CourseLessonOutline {
  id: string
  title: string
  description: string | null
  sortOrder: number
  status: string
  isPreview: boolean
  estimatedMinutes: number | null
  locked?: boolean
  progress?: {
    status: string
    progressPercent: number
    completedBlocks: number
    requiredBlocks: number
    timeSpentSeconds: number
  } | null
  blocks: CourseLessonBlockOutline[]
}

export interface CourseDetailResponse {
  id: string
  tenantId: string
  slug: string
  title: string
  summary: string | null
  description: string | null
  level: string | null
  status: CourseStatus
  isSequentialUnlock: boolean
  estimatedMinutes: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  instructors: CourseInstructorSummary[]
  lessons: CourseLessonOutline[]
}

const ALLOWED_KEYS = new Set([
  'q',
  'status',
  'sortBy',
  'order',
  'page',
  'limit',
])

export function toCourseQueryParams(
  params: CourseListParams = {},
): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const [key, raw] of Object.entries(params)) {
    if (!ALLOWED_KEYS.has(key) || raw === undefined) continue
    const trimmed = raw.trim()
    if (trimmed !== '') {
      normalized[key] = trimmed
    }
  }

  return normalized
}

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (params: Record<string, string> = {}) =>
    [...courseKeys.lists(), toCourseQueryParams(params)] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
}

export const courseQueries = {
  list: (params: CourseListParams = {}) => {
    const query = toCourseQueryParams(params)
    return queryOptions({
      queryKey: courseKeys.list(query),
      queryFn: () =>
        clientFetch<CourseListResponse>('/api/v1/courses', {
          query: query as Record<string, QueryParamValue>,
        }),
    })
  },

  detail: (id: string) =>
    queryOptions({
      queryKey: courseKeys.detail(id),
      queryFn: () => clientFetch<CourseDetailResponse>(`/api/v1/courses/${id}`),
      enabled: Boolean(id),
    }),
}
