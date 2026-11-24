// apps/web/src/lib/api.client.ts
const apiUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
).replace(/\/$/, '')

export type QueryParamValue = string | number | boolean | undefined | null

export interface ClientRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, QueryParamValue>
}

export class ClientApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ClientApiError'
    this.status = status
    this.body = body
  }
}

function buildUrl(
  path: string,
  query?: Record<string, QueryParamValue>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${apiUrl}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

export async function clientFetch<T>(
  path: string,
  options: ClientRequestOptions = {},
): Promise<T> {
  const { query, body, headers, ...rest } = options
  const url = buildUrl(path, query)
  const mergedHeaders = new Headers(headers)

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData && !mergedHeaders.has('content-type')) {
    mergedHeaders.set('content-type', 'application/json')
  }

  const res = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    credentials: 'include',
    body:
      body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  const contentType = res.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '')

  if (!res.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      ('message' in payload || 'error' in payload)
        ? String(
            ('message' in payload && payload.message) ||
              ('error' in payload && payload.error) ||
              `Request failed (${res.status})`,
          )
        : `Request failed (${res.status})`
    throw new ClientApiError(res.status, message, payload)
  }

  return payload as T
}
