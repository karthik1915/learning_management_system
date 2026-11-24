import { useQuery } from '@tanstack/react-query'

import { createFileRoute } from '@tanstack/react-router'
import { memberQueries } from '#/queries/members.ts'

export const Route = createFileRoute('/_authenticated/app/members/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: courseData, status } = useQuery(memberQueries.detail(id))

  if (status === 'pending') return <div>Loading...</div>
  if (status === 'error') return <div>Error</div>

  return <div>{JSON.stringify(courseData, null, 2)}</div>
}
