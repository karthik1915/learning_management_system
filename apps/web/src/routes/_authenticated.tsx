import { meQueryOptions } from '#/queries/me.ts'

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const meData = await context.queryClient.query(meQueryOptions())

    if (!meData) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Passed down to every child route's context!
    return {
      me: meData,
    }
  },
  component: () => <Outlet />,
})
