import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Router } from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { visibleEventIds } from './auth/access'
import { me, requireAuth, requireCsrfHeader } from './auth/session'
import type { Env } from './config/env'
import { createChannelSync } from './integrations/nexconn/channels'
import { createNexconnClient, type Fetch } from './integrations/nexconn/client'
import { errorHandler, HttpError } from './lib/http'
import { Activity } from './models'
import { authRoutes } from './routes/auth'
import { chatRoutes } from './routes/chat'
import { departmentRoutes } from './routes/departments'
import { eventRoutes } from './routes/events'
import { peopleRoutes } from './routes/people'
import { taskRoutes } from './routes/tasks'
import { analyticsRoutes } from './routes/analytics'

export function createApp(env: Env, opts: { nexconnFetch?: Fetch } = {}) {
  const nx = env.nexconn ? createNexconnClient(env.nexconn, opts.nexconnFetch) : null
  const sync = nx ? createChannelSync(nx) : null
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.trustProxy) // so req.ip / req.secure reflect the real client behind Render (and Vercel)
  app.use(helmet())
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.clientOrigins.includes(origin)),
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  const api = Router()
  api.get('/health', (_req, res) => {
    const db = mongoose.connection.readyState === 1
    // 503 when the database is unreachable so Render's health check can restart the instance.
    res.status(db ? 200 : 503).json({ ok: db, db: db ? 'connected' : 'disconnected' })
  })
  api.use(requireCsrfHeader)
  api.use('/auth', authRoutes(env))

  const authed = Router()
  authed.use(requireAuth(env))
  authed.use('/events', eventRoutes(sync))
  authed.use('/departments', departmentRoutes(sync))
  authed.use('/chat', chatRoutes(env, nx && sync ? { nx, sync } : null))
  authed.use('/people', peopleRoutes())
  authed.use('/tasks', taskRoutes())
  authed.use('/analytics', analyticsRoutes())
  authed.get('/activity', async (req, res) => {
    const u = me(req)
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const events = await visibleEventIds(u)
    const rows = await Activity.find({ $or: [{ eventId: { $in: events } }, { eventId: null, actorId: u._id }] })
      .sort({ at: -1, _id: -1 })
      .limit(limit)
    res.json(rows.map((a) => a.toJSON()))
  })
  api.use(authed)

  app.use('/api', api)
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Not found.')))
  app.use(errorHandler)
  return app
}
