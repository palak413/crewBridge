import { loginSchema, registerSchema } from '@crewbridge/shared'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import type { Env } from '../config/env'
import { clearSession, issueSession, me, requireAuth } from '../auth/session'
import { conflict, parse, unauthorized } from '../lib/http'
import { User } from '../models'

export function authRoutes(env: Env) {
  const r = Router()
  // A fixed hash so unknown emails take as long as wrong passwords (no account enumeration by timing).
  const dummyHash = bcrypt.hashSync('crewbridge-timing-equaliser', env.bcryptRounds)

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.nodeEnv === 'test' ? 1000 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Keyed by client IP + email, so users behind one shared proxy IP don't exhaust a single bucket.
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''}`,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } })
    },
  })

  r.post('/register', limiter, async (req, res) => {
    const input = parse(registerSchema, req.body)
    const email = input.email.toLowerCase()
    const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds)
    const existing = await User.findOne({ email })
    let user
    if (existing?.passwordHash) {
      throw conflict('An account with this email already exists.', { email: 'An account with this email already exists' })
    } else if (existing) {
      // Claim a directory entry an organizer or leader created for this email.
      existing.set({ name: input.name, role: input.role, passwordHash })
      user = await existing.save()
    } else {
      user = await User.create({ name: input.name, email, role: input.role, passwordHash })
    }
    issueSession(env, res, user._id)
    res.status(201).json({ user: user.toJSON() })
  })

  r.post('/login', limiter, async (req, res) => {
    const input = parse(loginSchema, req.body)
    const user = await User.findOne({ email: input.email.toLowerCase() })
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash)
    if (!user?.passwordHash || !ok) throw unauthorized('That email and password don’t match an account.')
    issueSession(env, res, user._id)
    res.json({ user: user.toJSON() })
  })

  r.post('/logout', (_req, res) => {
    clearSession(env, res)
    res.status(204).end()
  })

  r.get('/me', requireAuth(env), async (req, res) => {
    const user = await User.findById(me(req)._id)
    res.json({ user: user!.toJSON() })
  })

  return r
}
