import { courseQueries } from '#/queries/courses.ts'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/courses/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: CourseListData } = useQuery(courseQueries.list())

  return <div>{JSON.stringify(CourseListData, null, 2)}</div>
}
