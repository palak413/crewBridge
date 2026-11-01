import type { NextFunction, Request, Response } from 'express'
import mongoose, { Types } from 'mongoose'
import type { z } from 'zod'

/** Error with an HTTP status and a stable code, rendered as `{ error: { code, message, fields? } }`. */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const badRequest = (fields: Record<string, string>, message = 'Please check the highlighted fields.') =>
  new HttpError(422, 'VALIDATION', message, fields)
export const unauthorized = (message = 'Please sign in.') => new HttpError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = "You don't have permission to do that.") => new HttpError(403, 'FORBIDDEN', message)
export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found.`)
export const conflict = (message: string, fields?: Record<string, string>) => new HttpError(409, 'CONFLICT', message, fields)

/** Parse with a shared zod schema, converting issues into a 422 with field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input)
  if (r.success) return r.data
  const fields: Record<string, string> = {}
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || 'form'
    fields[key] ??= issue.message
  }
  throw badRequest(fields)
}

/** Parse a route id; invalid ObjectIds are treated as "not found". */
export function oid(value: unknown, what = 'Resource'): Types.ObjectId {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value) || String(new Types.ObjectId(value)) !== value) throw notFound(what)
  return new Types.ObjectId(value)
}

/** Validate a list of ids from a request body. */
export function oidList(value: unknown, field: string): Types.ObjectId[] {
  if (!Array.isArray(value) || value.length > 500) throw badRequest({ [field]: 'Provide a list of ids' })
  return [...new Set(value)].map((v) => {
    if (typeof v !== 'string' || !Types.ObjectId.isValid(v)) throw badRequest({ [field]: 'Invalid id in list' })
    return new Types.ObjectId(v)
  })
}

export const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b)

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } })
    return
  }
  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Request body must be valid JSON.' } })
    return
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
    res.status(422).json({ error: { code: 'VALIDATION', message: 'Please check the highlighted fields.', fields } })
    return
  }
  if (typeof err === 'object' && err && 'code' in err && (err as { code: unknown }).code === 11000) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'That record already exists.' } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } })
}
