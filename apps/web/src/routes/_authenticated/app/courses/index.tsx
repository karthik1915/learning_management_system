import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { CoursesTable } from '#/components/dashboard/data-table/courses/index.tsx'
import { courseQueries } from '#/queries/courses.ts'
import { Button } from '#/components/ui/button.tsx'

export const Route = createFileRoute('/_authenticated/app/courses/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: CourseListData, status } = useQuery(courseQueries.list())

  if (status === 'pending') return <div>Loading...</div>
  if (status === 'error') return <div>Error</div>

  return (
    <section id="courses-section">
      <header
        id="courses-header"
        className="flex items-center justify-between pt-2 pb-4"
      >
        <h1 className="font-semibold text-2xl">Academy Courses</h1>
        <Button>Add Course</Button>
      </header>
      <CoursesTable data={CourseListData.data} />
    </section>
  )
}
