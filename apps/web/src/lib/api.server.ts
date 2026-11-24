import { getRequestHeader } from '@tanstack/react-start/server'
import type { App } from '@lms/api'

const apiUrl = (process.env.VITE_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
)

export type ApiRoutePath = keyof App['~Routes'] extends string
  ? keyof App['~Routes']
  : `/${string}`

export interface ApiRequestOptions extends Omit<
  RequestInit,
  'headers' | 'body'
> {
  headers?: HeadersInit
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function buildUrl(path: string, query?: ApiRequestOptions['query']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${apiUrl}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

export function getServerApi() {
  const cookie = getRequestHeader('cookie') ?? ''

  async function request<TResponse = unknown>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<TResponse> {
    const { body, query, headers, method = 'GET', ...rest } = options
    const url = buildUrl(path, query)

    const mergedHeaders = new Headers(headers)
    if (cookie) {
      mergedHeaders.set('cookie', cookie)
    }

    const hasJsonBody = body !== undefined && !(body instanceof FormData)
    if (hasJsonBody && !mergedHeaders.has('content-type')) {
      mergedHeaders.set('content-type', 'application/json')
    }

    const response = await fetch(url, {
      ...rest,
      method,
      headers: mergedHeaders,
      body: hasJsonBody ? JSON.stringify(body) : (body as BodyInit | undefined),
    })

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : `API request failed (${response.status} ${response.statusText})`

      throw new ApiError(response.status, message, payload)
    }

    return payload as TResponse
  }

  return {
    request,
    get: <T = unknown>(
      path: string,
      query?: ApiRequestOptions['query'],
      init?: ApiRequestOptions,
    ) => request<T>(path, { ...init, method: 'GET', query }),
    post: <T = unknown>(
      path: string,
      body?: unknown,
      init?: ApiRequestOptions,
    ) => request<T>(path, { ...init, method: 'POST', body }),
    put: <T = unknown>(
      path: string,
      body?: unknown,
      init?: ApiRequestOptions,
    ) => request<T>(path, { ...init, method: 'PUT', body }),
    patch: <T = unknown>(
      path: string,
      body?: unknown,
      init?: ApiRequestOptions,
    ) => request<T>(path, { ...init, method: 'PATCH', body }),
    delete: <T = unknown>(path: string, init?: ApiRequestOptions) =>
      request<T>(path, { ...init, method: 'DELETE' }),
  }
}
