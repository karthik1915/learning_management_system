import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Edit, Lock } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { buttonVariants } from '#/components/ui/button.tsx'
import { courseQueries } from '#/queries/courses.ts'

export const Route = createFileRoute(
  '/_authenticated/app/courses/$courseId/$lessonId',
)({
  loader: async ({ context, params }) => {
    await context.queryClient.query(
      courseQueries.lesson(params.courseId, params.lessonId),
    )
  },
  component: LessonDetailPage,
})

function LessonDetailPage() {
  const { courseId, lessonId } = Route.useParams()
  const { data, status } = useQuery(courseQueries.lesson(courseId, lessonId))

  if (status === 'pending') {
    return <div className="p-4">Loading lesson...</div>
  }
  if (status === 'error' || !data) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Lesson not found or unavailable.
        </p>
        <Link
          to="/app/courses/$courseId"
          params={{ courseId }}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <ChevronLeft className="size-4" />
          Back to Course Overview
        </Link>
      </div>
    )
  }

  const { lesson, viewer } = data
  const sortedBlocks = [...lesson.blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className={buttonVariants({ variant: 'secondary' })}
          to="/app/courses/$courseId"
          params={{ courseId }}
        >
          <ChevronLeft className="size-3.5" />
          Back to Course Overview
        </Link>
        <div className="flex items-center gap-2">
          {/* <Badge variant="outline">{lesson.status}</Badge>
          {lesson.estimatedMinutes != null && (
            <Badge variant="secondary">{lesson.estimatedMinutes} mins</Badge>
          )}
          {lesson.progress && (
            <Badge variant="secondary">
              {lesson.progress.status} ({lesson.progress.progressPercent}%)
            </Badge>
          )} */}
          {viewer.canEdit && (
            <Link
              className={buttonVariants({ variant: 'outline' })}
              to="/app/courses/$courseId/edit"
              params={{ courseId }}
              search={{ lessonId }}
            >
              <Edit />
              Edit Lesson
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          {lesson.sortOrder}. {lesson.title}
        </h2>
        {lesson.description && (
          <p className="text-muted-foreground text-sm">{lesson.description}</p>
        )}
      </div>

      {lesson.locked ? (
        <div className="rounded-xl border p-6 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Lock className="size-4" />
            Lesson Locked
          </div>
          <p className="text-muted-foreground text-sm">
            Complete previous required lessons to unlock this content.
          </p>
        </div>
      ) : sortedBlocks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No blocks in this lesson yet.
        </p>
      ) : (
        <ol className="space-y-4">
          {sortedBlocks.map((block) => (
            <li key={block.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">
                  {block.title ?? `${block.blockType} Block ${block.sortOrder}`}
                </span>
                <Badge variant="outline">{block.blockType}</Badge>
              </div>
              {/* Render block content/url/media based on block.blockType */}
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
