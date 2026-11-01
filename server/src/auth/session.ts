import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import type { Env } from '../config/env'
import { forbidden, HttpError, unauthorized } from '../lib/http'
import { User, type UserDoc } from '../models'

export const SESSION_COOKIE = 'cb_session'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserDoc
  }
}

export function issueSession(env: Env, res: Response, userId: Types.ObjectId) {
  const token = jwt.sign({}, env.jwtSecret, { algorithm: 'HS256', subject: String(userId), expiresIn: MAX_AGE_MS / 1000 })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearSession(env: Env, res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/' })
}

/** Resolve the session cookie to a user, or respond 401. */
export function requireAuth(env: Env) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE]
    if (typeof token !== 'string' || !token) throw unauthorized()
    let sub: string | undefined
    try {
      sub = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }).sub as string | undefined
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.')
    }
    if (!sub || !Types.ObjectId.isValid(sub)) throw unauthorized()
    const user = await User.findById(sub).lean<UserDoc>()
    if (!user || !user.passwordHash) throw unauthorized('Your session has expired. Please sign in again.')
    req.user = user
    next()
  }
}

export function requireRole(...roles: UserDoc['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden()
    next()
  }
}

/**
 * CSRF guard: state-changing requests must carry a custom header. Browsers only allow cross-origin
 * pages to send custom headers after a CORS preflight, which our CORS policy refuses for unknown origins.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('x-requested-with') !== 'CrewBridge') throw new HttpError(403, 'FORBIDDEN', 'Missing request header.')
  next()
}

export const me = (req: Request): UserDoc => {
  if (!req.user) throw unauthorized()
  return req.user
}
