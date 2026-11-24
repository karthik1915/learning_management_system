// apps/web/src/lib/session.server.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:4000'

export type AuthSession = {
  user: {
    id: string
    email: string
    name: string
    image?: string | null
  }
  session: {
    id: string
    expiresAt: string
  }
} | null

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    const res = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: { cookie },
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.session ? data : null
  },
)
