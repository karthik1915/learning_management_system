import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { courseQueries } from '#/queries/courses.ts'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton.tsx'

interface CourseLessonsListProps {}

export const CourseLessonsListSkeleton: React.FC = () => {
  return (
    <aside
      aria-busy="true"
      aria-label="Loading lessons"
      className="min-w-0 space-y-4 lg:sticky lg:top-6"
    >
      <Skeleton className="h-8 w-46" />

      <ol className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
        ))}
      </ol>
    </aside>
  )
}

const CourseLessonsList: React.FC<CourseLessonsListProps> = () => {
  const { courseId, lessonId: activeLessonId } = useParams({
    strict: false,
  }) as {
    courseId?: string
    lessonId?: string
  }

  const { data, status } = useQuery({
    ...courseQueries.lessons(courseId ?? ''),
    enabled: Boolean(courseId),
  })

  if (!courseId || status === 'pending') {
    return <CourseLessonsListSkeleton />
  }

  if (status === 'error' || !data) {
    return (
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
        <p className="text-destructive text-sm">error</p>
      </aside>
    )
  }

  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold">Lessons ({data.lessons.length})</h2>

      <ol className="space-y-4">
        {data.lessons.map((item) => {
          const isActive =
            activeLessonId !== undefined && item.id === activeLessonId

          return (
            <li key={item.id}>
              <Link
                to="/app/courses/$courseId/$lessonId"
                params={{ courseId, lessonId: item.id }}
                className={cn(
                  'block rounded-xl border border-border px-3 py-3 transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'bg-accent hover:bg-accent/80',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <p>
                    {item.sortOrder}. {item.title}
                  </p>

                  {item.estimatedMinutes != null && (
                    <span className="text-muted-foreground text-xs">
                      · {item.estimatedMinutes} mins
                    </span>
                  )}

                  {item.progress && (
                    <span className="text-xs">
                      · {item.progress.status} ({item.progress.progressPercent}
                      %)
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {item.description}
                  </p>
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

export default CourseLessonsList
