import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { me } = Route.useRouteContext()

  return (
    <div>
      <code>{JSON.stringify(me, null, 2)}</code>
    </div>
  )
}
