import { ColumnDef } from '@tanstack/react-table'
import { features } from '../data-table-features'

import { Member } from '@lms/types/users'
import { Link } from '@tanstack/react-router'
import { formatDate } from '#/utils/data-format.ts'
import { buttonVariants } from '#/components/ui/button.tsx'
import { Badge } from '#/components/ui/badge.tsx'

export const coursesColumn: Array<ColumnDef<typeof features, Member>> = [
  {
    accessorKey: 'admissionNo',
    header: 'Admission No',
  },
  {
    accessorKey: 'displayName',
    header: 'Name',
    cell: (info) => (
      <div>
        <div>{info.row.original.displayName}</div>
        <small className="text-sm">{info.row.original.email}</small>
      </div>
    ),
  },
  {
    accessorKey: 'phone',
    header: () => 'Phone',
  },
  {
    accessorKey: 'status',
    header: () => 'Status',
    cell: (info) => <Badge>{info.row.original.status}</Badge>,
  },
  {
    accessorKey: 'joinedAt',
    header: () => 'Joined At',
    cell: (info) => <p>{formatDate(info.row.original.joinedAt)}</p>,
  },
  {
    id: 'roles',
    header: () => 'Status',
    cell: (info) => <p>{info.row.original.roles[0]}</p>,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Link
        className={buttonVariants()}
        to="/app/members/$id"
        params={{ id: row.original.id }}
      >
        View
      </Link>
    ),
  },
]
