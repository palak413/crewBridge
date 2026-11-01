import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { isOrganizerOf, visibleEventFilter, visiblePeopleIds } from '../auth/access'
import { me } from '../auth/session'
import type { Env } from '../config/env'
import type { ChannelSync } from '../integrations/nexconn/channels'
import type { NexconnClient } from '../integrations/nexconn/client'
import { HttpError, sameId } from '../lib/http'
import { Department, Event } from '../models'

export interface ChatChannel {
  channelId: string
  kind: 'event' | 'department'
  eventId: string
  departmentId: string | null
  name: string
  eventTitle: string
}

/**
 * POST /api/chat/session — everything the browser needs to connect to Nexconn:
 * the public App Key + data center, a per-user access token issued by the Server API, and the group
 * channels this user is authorized for (memberships are reconciled before returning).
 * The App Secret is never included.
 */
export function chatRoutes(env: Env, deps: { nx: NexconnClient; sync: ChannelSync } | null) {
  const r = Router()
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: env.nodeEnv === 'test' ? 1000 : 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many chat connections. Please wait a moment.' } })
    },
  })

  r.post('/session', limiter, async (req, res) => {
    if (!env.nexconn || !deps) {
      res.json({ enabled: false })
      return
    }
    const u = me(req)
    const events = await Event.find(visibleEventFilter(u)).sort({ startAt: 1 })
    const departments = await Department.find({ eventId: { $in: events.map((e) => e._id) } }).collation({ locale: 'en' }).sort({ name: 1 })

    const channels: ChatChannel[] = []
    try {
      for (const e of events) {
        await deps.sync.syncEvent(e._id)
        channels.push({ channelId: `evt${e.id}`, kind: 'event', eventId: e.id, departmentId: null, name: e.title, eventTitle: e.title })
        for (const d of departments.filter((x) => sameId(x.eventId, e._id))) {
          const authorized = isOrganizerOf(u, e) || sameId(d.leaderId, u._id) || d.memberIds.some((m) => sameId(m, u._id))
          if (!authorized) continue
          await deps.sync.syncDepartment(d._id)
          channels.push({ channelId: `dep${d.id}`, kind: 'department', eventId: e.id, departmentId: d.id, name: d.name, eventTitle: e.title })
        }
      }
      const token = await deps.nx.issueAccessToken(String(u._id), u.name)
      const contacts = (await visiblePeopleIds(u)).map(String).filter((id) => id !== String(u._id))
      res.json({ enabled: true, appKey: env.nexconn.appKey, area: env.nexconn.area, userId: String(u._id), token, channels, contacts })
    } catch (err) {
      if (err instanceof HttpError) throw err
      console.error('[nexconn] chat session failed:', err instanceof Error ? err.message : err)
      throw new HttpError(502, 'CHAT_UNAVAILABLE', 'Messaging is temporarily unavailable. Please try again shortly.')
    }
  })

  return r
}
