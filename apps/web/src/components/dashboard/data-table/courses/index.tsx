import { DataTable } from '..'
import { coursesColumn } from './column'

import { CourseListItem } from '@lms/types/courses'

export const CoursesTable = ({ data }: { data: CourseListItem[] }) => {
  return <DataTable columns={coursesColumn} data={data} />
}
