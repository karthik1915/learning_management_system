import Sidebar from '#/components/dashboard/sidebar/index.tsx'
import Topbar from '#/components/dashboard/topbar/index.tsx'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app')({
  component: RouteComponent,
})

const Navigation = [
  {
    id: '1',
    href: '/app/members',
    name: 'Members',
    icon: '',
  },
  {
    id: '3',
    href: '/app/courses',
    name: 'Courses',
    icon: '',
  },
  {
    id: '2',
    href: '/app/settings',
    name: 'Settings',
    icon: '',
  },
]

function RouteComponent() {
  const { me } = Route.useRouteContext()

  return (
    <div>
      <Sidebar nav={Navigation} tenant={me.tenant}>
        <header>
          <Topbar />
        </header>

        <div className="p-4">
          <Outlet />
        </div>
      </Sidebar>
    </div>
  )
}
