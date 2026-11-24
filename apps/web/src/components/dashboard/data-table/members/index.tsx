import { DataTable } from '..'
import { coursesColumn } from './column'

import { Member } from '@lms/types/users'
import { Input } from '#/components/ui/input.tsx'

export const MembersTable = ({ data }: { data: Member[] }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input className="max-w-[256px]" placeholder="Search members" />
        <div className="flex items-center justify-between gap-2">
          <p>Col visibility</p>
          <p>Export</p>
        </div>
      </div>
      <DataTable columns={coursesColumn} data={data} />
    </div>
  )
}
