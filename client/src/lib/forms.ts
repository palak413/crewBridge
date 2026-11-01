import type { z } from 'zod'
import { ApiError } from './api/client'

export type FieldErrors = Record<string, string>

/** Validate client-side with the shared schema; returns parsed data or field errors. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): { data: z.output<S>; errors: null } | { data: null; errors: FieldErrors } {
  const r = schema.safeParse(input)
  if (r.success) return { data: r.data, errors: null }
  const errors: FieldErrors = {}
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || 'form'
    errors[key] ??= issue.message
  }
  return { data: null, errors }
}

/** Split a thrown error into field errors (if any) and a form-level message. */
export function submitErrors(err: unknown): { fields: FieldErrors; message: string | null } {
  if (err instanceof ApiError) {
    const fields = err.fields ?? {}
    return { fields, message: Object.keys(fields).length ? null : err.message }
  }
  return { fields: {}, message: 'Something went wrong. Please try again.' }
}
