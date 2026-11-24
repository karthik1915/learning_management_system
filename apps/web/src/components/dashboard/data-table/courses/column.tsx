import { ColumnDef } from '@tanstack/react-table'
import { features } from '../data-table-features'

import { CourseListItem } from '@lms/types/courses'
import { Link } from '@tanstack/react-router'

export const coursesColumn: Array<ColumnDef<typeof features, CourseListItem>> =
  [
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'status',
      header: () => 'Status',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Link to="/app/courses/$id" params={{ id: row.original.id }}>
          View
        </Link>
      ),
    },
  ]
