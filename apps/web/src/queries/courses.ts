import { queryOptions } from '@tanstack/react-query'
import { clientFetch, type QueryParamValue } from '@/lib/api.client'
import type {
  CourseDetailResponse,
  CourseLessonDetailResponse,
  CourseLessonsResponse,
  CourseListResponse,
} from '@lms/types/courses'

export type CourseListParams = Record<string, string | undefined>

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
  lessonLists: () => [...courseKeys.all, 'lessons'] as const,
  lessons: (courseId: string) =>
    [...courseKeys.lessonLists(), courseId] as const,
  lessonSingle: () => [...courseKeys.all, 'lesson'] as const,
  lesson: (courseId: string, lessonId: string) =>
    [...courseKeys.lessonSingle(), courseId, lessonId] as const,
}

export const courseQueries = {
  // List all the courses available
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

  // Get the full course details
  detail: (id: string) =>
    queryOptions({
      queryKey: courseKeys.detail(id),
      queryFn: () => clientFetch<CourseDetailResponse>(`/api/v1/courses/${id}`),
      enabled: Boolean(id),
    }),

  // Get available lessons for the course
  lessons: (courseId: string) =>
    queryOptions({
      queryKey: courseKeys.lessons(courseId),
      queryFn: () =>
        clientFetch<CourseLessonsResponse>(
          `/api/v1/courses/${courseId}/lessons`,
        ),
      enabled: Boolean(courseId),
      staleTime: 30_000,
    }),

  // Get the course's lesson details
  lesson: (courseId: string, lessonId: string) =>
    queryOptions({
      queryKey: courseKeys.lesson(courseId, lessonId),
      queryFn: () =>
        clientFetch<CourseLessonDetailResponse>(
          `/api/v1/courses/${courseId}/${lessonId}`,
        ),
      enabled: Boolean(courseId) && Boolean(lessonId),
      staleTime: 30_000,
    }),
}
