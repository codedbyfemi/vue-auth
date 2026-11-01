const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// ---- token storage -------------------------------------------------------

const ACCESS_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'

export const tokens = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(pair: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, pair.accessToken)
    localStorage.setItem(REFRESH_KEY, pair.refreshToken)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// The store registers this so it can reset its state when a refresh fails.
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn
}

// ---- low-level helpers ---------------------------------------------------

async function send(
  path: string,
  method: string,
  body: unknown,
  accessToken: string | null,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Can’t reach the server. Check that it is running and try again.', 0)
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text() // 204 responses have an empty body
  let data: { message?: string; error?: string } | null = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* body wasn't JSON */
  }
  if (!res.ok) {
    throw new ApiError(
      data?.message ?? data?.error ?? `Request failed (${res.status}).`,
      res.status,
    )
  }
  return data as unknown as T
}

// ---- refresh (single-flight) --------------------------------------------
// Refresh tokens rotate and are one-time use, so two simultaneous refreshes with
// the same token would look like token theft to your server and kill the session.
// Sharing one in-flight promise prevents that.

let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokens.refresh
  if (!refreshToken) return false
  try {
    const res = await send('/auth/refresh', 'POST', { refreshToken }, null)
    tokens.set(await parse<AuthResponse>(res))
    return true
  } catch (e) {
    // Server unreachable: keep the tokens and try again later.
    // Server rejected the refresh token: the session is over.
    if (!(e instanceof ApiError && e.status === 0)) {
      tokens.clear()
      onSessionExpired?.()
    }
    return false
  }
}

// ---- public request function --------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the access token and auto-refresh on 401. Set false for login/register/logout. */
  auth?: boolean
  /** Send exactly this token and never auto-refresh (used by logout). */
  accessToken?: string | null
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, accessToken } = options
  const explicit = accessToken !== undefined

  let res = await send(path, method, body, explicit ? accessToken : auth ? tokens.access : null)

  if (res.status === 401 && auth && !explicit && tokens.refresh) {
    if (await refreshSession()) {
      res = await send(path, method, body, tokens.access) // retry once with the new token
    }
  }
  return parse<T>(res)
}
