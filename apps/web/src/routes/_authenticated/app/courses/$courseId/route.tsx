import { Outlet, createFileRoute } from '@tanstack/react-router'

import CourseLessonsList from '#/components/dashboard/courses/lessons.tsx'

export const Route = createFileRoute('/_authenticated/app/courses/$courseId')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="mx-auto p-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_450px] items-start">
        <Outlet />
        <CourseLessonsList />
      </div>
    </main>
  )
}
