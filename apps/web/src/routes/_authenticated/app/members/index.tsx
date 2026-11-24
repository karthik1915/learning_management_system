import { useMembers } from '#/queries/members.ts'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/members/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useMembers()

  return (
    <div>
      <h1>Members</h1>

      {isLoading ? 'Loading...' : <code>{JSON.stringify(data)}</code>}
    </div>
  )
}
