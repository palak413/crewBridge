/**
 * Typed HTTP client for the CrewBridge API.
 *
 * - Sends cookies (`credentials: 'include'`) so auth can use httpOnly JWT cookies.
 * - Normalises every failure into an `ApiError` with a stable `code`, so UI code
 *   never has to inspect raw `Response` objects.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type ApiErrorCode =
  | 'SERVER_UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNKNOWN'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, status = 0, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string> }
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return 'VALIDATION'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'SERVER_UNAVAILABLE'
  return 'UNKNOWN'
}

const UNAVAILABLE_MESSAGE = "We couldn't reach the CrewBridge server. Please try again in a moment."

export async function apiRequest<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers, ...rest } = init
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...rest,
      headers: {
        Accept: 'application/json',
        // CSRF guard: the API rejects state-changing requests without this header.
        'X-Requested-With': 'CrewBridge',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('SERVER_UNAVAILABLE', UNAVAILABLE_MESSAGE)
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const payload: unknown = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const err = (payload as ErrorBody | null)?.error
    const code = codeFromStatus(response.status)
    // A non-JSON 5xx usually means a proxy/gateway answered, not our API.
    const message =
      code === 'SERVER_UNAVAILABLE' && !err?.message ? UNAVAILABLE_MESSAGE : (err?.message ?? 'Something went wrong.')
    throw new ApiError(code, message, response.status, err?.fields)
  }

  if (response.status === 204) return undefined as T

  if (!isJson) {
    // Our API always answers JSON; anything else (e.g. an HTML fallback page) means it's not reachable.
    throw new ApiError('SERVER_UNAVAILABLE', UNAVAILABLE_MESSAGE, response.status)
  }
  return payload as T
}
