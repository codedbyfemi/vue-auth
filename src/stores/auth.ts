import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request, tokens, ApiError, setSessionExpiredHandler, type AuthResponse } from '@/lib/api'

export interface User {
  id: number
  email: string
  name: string
}

export interface Credentials {
  email: string
  password: string
}

export interface RegisterInput extends Credentials {
  name: string
}

// Your Spring errors don't include a message by default, so we map by status code.
function explain(e: unknown, byStatus: Record<number, string>): Error {
  if (e instanceof ApiError && byStatus[e.status]) return new Error(byStatus[e.status])
  return e instanceof Error ? e : new Error('Something went wrong.')
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false) // true once the saved session has been checked
  const isLoggedIn = computed(() => user.value !== null)

  // If a refresh fails anywhere, api.ts calls this so the UI signs out.
  setSessionExpiredHandler(() => {
    user.value = null
  })

  async function fetchMe(): Promise<void> {
    user.value = await request<User>('/api/me')
  }

  // Called once by the router guard to restore the session after a page refresh.
  async function init(): Promise<void> {
    if (ready.value) return
    if (tokens.access || tokens.refresh) {
      try {
        await fetchMe() // refreshes automatically if the access token has expired
      } catch {
        /* invalid session or server down: stay signed out */
      }
    }
    ready.value = true
  }

  async function register(input: RegisterInput): Promise<void> {
    try {
      const pair = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name: input.name, email: input.email, password: input.password },
        auth: false,
      })
      tokens.set(pair)
      await fetchMe()
    } catch (e) {
      if (!user.value) tokens.clear()
      throw explain(e, {
        409: 'An account with this email already exists.',
        400: 'Check your details: use a valid email and a password of at least 8 characters.',
      })
    }
  }

  async function login(input: Credentials): Promise<void> {
    try {
      const pair = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email: input.email, password: input.password },
        auth: false,
      })
      tokens.set(pair)
      await fetchMe()
    } catch (e) {
      if (!user.value) tokens.clear()
      throw explain(e, {
        401: 'Email or password is incorrect.',
        400: 'Enter a valid email and password.',
      })
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = tokens.refresh
    const accessToken = tokens.access
    tokens.clear()
    user.value = null // sign out in the UI immediately
    if (refreshToken) {
      try {
        await request<void>('/api/logout', { method: 'POST', body: { refreshToken }, accessToken })
      } catch {
        /* already signed out locally; nothing more to do */
      }
    }
  }

  return { user, ready, isLoggedIn, init, register, login, logout }
})
