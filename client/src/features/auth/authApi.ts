import { apiRequest } from '../../lib/api/client'
import type { LoginInput, RegisterInput, Role } from './schemas'

/**
 * Real auth endpoints (implemented server-side in Milestone 3).
 * No client-side fallback: if the server isn't reachable, the request fails and the UI says so.
 */

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export function login(input: LoginInput) {
  return apiRequest<{ user: AuthUser }>('/auth/login', { method: 'POST', body: input })
}

export function register(input: RegisterInput) {
  return apiRequest<{ user: AuthUser }>('/auth/register', { method: 'POST', body: input })
}

/** Where each role lands after sign-in. Volunteers get their own home in Milestone 5. */
export function homePathFor(_role: Role) {
  return '/app'
}
