import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const editCourseSearchSchema = z.object({
  lessonId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/app/courses/_/$courseId/edit',
)({
  component: RouteComponent,
  validateSearch: editCourseSearchSchema,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/app/courses/$id/edit"!</div>
}
