import { tenantQueries } from '#/queries/tenant.ts'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: tenantProfile } = useQuery(tenantQueries.profile())
  const { data: tenantContacts } = useQuery(tenantQueries.contacts())
  const { data: tenantSettings } = useQuery(tenantQueries.settings())
  const { data: tenantBankAccounts } = useQuery(tenantQueries.bankAccounts())

  return (
    <div>
      <div>
        <h2>Tenant Profile</h2> {JSON.stringify(tenantProfile, null, 2)}
      </div>
      <div>
        <h2>Tenant Contact</h2> {JSON.stringify(tenantContacts, null, 2)}
      </div>
      <div>
        <h2>Tenant Settings</h2> {JSON.stringify(tenantSettings, null, 2)}
      </div>
      <div>
        <h2>Tenant Bank Accounts</h2>{' '}
        {JSON.stringify(tenantBankAccounts, null, 2)}
      </div>
    </div>
  )
}
