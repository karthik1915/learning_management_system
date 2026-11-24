import { Button } from '#/components/ui/button.tsx'
import { memberQueries } from '#/queries/members.ts'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { MembersTable } from '#/components/dashboard/data-table/members/index.tsx'
import { CourseAnalyticsOverview } from '#/components/dashboard/status-card/card-1.tsx'

export const Route = createFileRoute('/_authenticated/app/members/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: membersData, status } = useQuery(memberQueries.list())

  if (status === 'pending') return <div>Loading...</div>
  if (status === 'error') return <div>Error</div>

  return (
    <section id="members-section">
      <header
        id="members-header"
        className="flex items-center justify-between pt-2 pb-4"
      >
        <h1 className="font-semibold text-2xl">Academy Members</h1>
        <Button>Invite Members</Button>
      </header>

      <main id="members-main">
        <CourseAnalyticsOverview />
        <MembersTable data={membersData.data} />
      </main>
    </section>
  )
}
