import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '@/lib/api.client'

import {
  TenantProfileResponse,
  TenantContact,
  TenantAddress,
  TenantTaxProfile,
  TenantBankAccount,
  TenantDomain,
  TenantSetting,
} from '@lms/types/tenant'

export const tenantKeys = {
  all: ['tenant'] as const,
  profile: () => [...tenantKeys.all, 'profile'] as const,
  contacts: () => [...tenantKeys.all, 'contacts'] as const,
  addresses: () => [...tenantKeys.all, 'addresses'] as const,
  domains: () => [...tenantKeys.all, 'domains'] as const,
  settings: (namespace?: string) =>
    [...tenantKeys.all, 'settings', namespace ?? 'all'] as const,
  taxProfile: () => [...tenantKeys.all, 'tax-profile'] as const,
  bankAccounts: () => [...tenantKeys.all, 'bank-accounts'] as const,
}

export const tenantQueries = {
  profile: () =>
    queryOptions({
      queryKey: tenantKeys.profile(),
      queryFn: () => clientFetch<TenantProfileResponse>('/api/v1/tenant'),
    }),

  contacts: () =>
    queryOptions({
      queryKey: tenantKeys.contacts(),
      queryFn: () => clientFetch<TenantContact[]>('/api/v1/tenant/contacts'),
    }),

  addresses: () =>
    queryOptions({
      queryKey: tenantKeys.addresses(),
      queryFn: () => clientFetch<TenantAddress[]>('/api/v1/tenant/addresses'),
    }),

  domains: () =>
    queryOptions({
      queryKey: tenantKeys.domains(),
      queryFn: () => clientFetch<TenantDomain[]>('/api/v1/tenant/domains'),
    }),

  settings: (namespace?: string) =>
    queryOptions({
      queryKey: tenantKeys.settings(namespace),
      queryFn: () =>
        clientFetch<TenantSetting[]>('/api/v1/tenant/settings', {
          query: namespace ? { namespace } : undefined,
        }),
    }),

  taxProfile: () =>
    queryOptions({
      queryKey: tenantKeys.taxProfile(),
      queryFn: () =>
        clientFetch<TenantTaxProfile | null>('/api/v1/tenant/tax-profile'),
    }),

  bankAccounts: () =>
    queryOptions({
      queryKey: tenantKeys.bankAccounts(),
      queryFn: () =>
        clientFetch<TenantBankAccount[]>('/api/v1/tenant/bank-accounts'),
    }),
}
