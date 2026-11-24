import { useQuery } from '@tanstack/react-query'

import { ChevronLeft, Edit } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { createFileRoute, Link } from '@tanstack/react-router'
import { courseQueries } from '#/queries/courses.ts'
import { buttonVariants } from '#/components/ui/button.tsx'

export const Route = createFileRoute('/_authenticated/app/courses/$courseId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { courseId } = Route.useParams()
  const { data, status } = useQuery(courseQueries.detail(courseId))

  if (status === 'pending') return <div className="p-6">Loading course...</div>
  if (status === 'error')
    return <div className="p-6">Failed to load course.</div>

  const { course, viewer } = data

  return (
    <section className="min-w-0 space-y-6" id="course-lession-content">
      <nav className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className={buttonVariants({ variant: 'secondary' })}
          to="/app/courses"
        >
          <ChevronLeft /> Back to Courses
        </Link>

        {viewer.canEdit && (
          <Link
            className={buttonVariants({ variant: 'outline' })}
            to="/app/courses/$courseId/edit"
            params={{ courseId }}
          >
            <Edit />
            Edit Course
          </Link>
        )}
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
          {course.title}
        </h1>
        {course.summary && (
          <p className="text-muted-foreground text-sm sm:text-base">
            {course.summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge>{course.status}</Badge>
          {course.level && <Badge>{course.level}</Badge>}
          {course.deliveryMode && <Badge>{course.deliveryMode}</Badge>}
          {course.estimatedMinutes != null && (
            <Badge variant="secondary">{course.estimatedMinutes} Minutes</Badge>
          )}
        </div>
      </header>

      {/* image should be here */}

      <div className="bg-accent w-full h-52 sm:h-72 md:h-80 rounded-2xl mb-4" />

      {course.description && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {course.description}
          </pre>
        </section>
      )}
    </section>
  )
}
