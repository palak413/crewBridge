import { z } from 'zod'
import type { Role } from './types'

// Auth input schemas, used by the client forms and the API.

export const roles = ['organizer', 'leader', 'volunteer'] as const satisfies readonly Role[]

const email = z.string().trim().min(1, 'Enter your email address').pipe(z.email('Enter a valid email address'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'Contains a letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'number', label: 'Contains a number', test: (v: string) => /\d/.test(v) },
] as const

export const registerSchema = z.object({
  role: z.enum(roles, { error: 'Choose how you’ll use CrewBridge' }),
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Keep your name under 80 characters'),
  email,
  password: z
    .string()
    .max(128, 'Use 128 characters or fewer')
    .refine((v) => passwordRules.every((r) => r.test(v)), 'Use at least 8 characters with a letter and a number'),
})
export type RegisterInput = z.infer<typeof registerSchema>
