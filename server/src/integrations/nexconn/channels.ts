import type { Types } from 'mongoose'
import { Department, Event } from '../../models'
import type { NexconnClient } from './client'

/**
 * Keeps Nexconn group channels in step with CrewBridge membership. The server is the only party that
 * adds or removes group members, so a user can only ever be in the channels of events/departments they
 * belong to.
 *
 * - Event channel members: the organizer + event members.
 * - Department channel members: the organizer + department members + leader.
 *
 * `chatMemberIds` records who is joined on Nexconn; every reconcile joins the missing and removes the
 * unauthorized, so a failed call is healed on the next reconcile.
 */
export const eventChannelId = (id: Types.ObjectId | string) => `evt${String(id)}`
export const departmentChannelId = (id: Types.ObjectId | string) => `dep${String(id)}`

type Log = (msg: string, err?: unknown) => void

export function createChannelSync(nx: NexconnClient, log: Log = (m, e) => console.error(m, e instanceof Error ? e.message : e)) {
  // Serialize work per channel so concurrent requests don't create the same group twice.
  const locks = new Map<string, Promise<unknown>>()
  function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(key) ?? Promise.resolve()
    const next = prev.catch(() => undefined).then(fn)
    locks.set(key, next)
    void next.finally(() => locks.get(key) === next && locks.delete(key)).catch(() => undefined)
    return next
  }

  type Doc = InstanceType<typeof Event> | InstanceType<typeof Department>

  async function reconcile(doc: Doc, channelId: string, name: string, owner: string, desired: string[]) {
    const want = [...new Set([owner, ...desired])]
    if (!doc.chatChannelId) {
      await nx.createGroup(channelId, name, owner, want)
      doc.set({ chatChannelId: channelId, chatMemberIds: want })
      await doc.save()
      return
    }
    const have = new Set(doc.chatMemberIds.map(String))
    const toJoin = want.filter((id) => !have.has(id))
    const toLeave = [...have].filter((id) => !want.includes(id))
    if (toJoin.length) await nx.join(doc.chatChannelId, toJoin)
    if (toLeave.length) await nx.leave(doc.chatChannelId, toLeave)
    if (toJoin.length || toLeave.length) {
      doc.set({ chatMemberIds: want })
      await doc.save()
    }
  }

  async function syncEvent(eventId: Types.ObjectId | string) {
    return locked(eventChannelId(eventId), async () => {
      const e = await Event.findById(eventId)
      if (!e) return null
      await reconcile(e, eventChannelId(e._id), e.title, String(e.organizerId), e.memberIds.map(String))
      return e
    })
  }

  async function syncDepartment(deptId: Types.ObjectId | string) {
    return locked(departmentChannelId(deptId), async () => {
      const d = await Department.findById(deptId)
      if (!d) return null
      const e = await Event.findById(d.eventId, { organizerId: 1, title: 1 }).lean()
      if (!e) return null
      const members = [...d.memberIds.map(String), ...(d.leaderId ? [String(d.leaderId)] : [])]
      await reconcile(d, departmentChannelId(d._id), `${e.title} · ${d.name}`, String(e.organizerId), members)
      return d
    })
  }

  /** Event membership changes ripple into its departments (removed members leave department channels too). */
  async function syncEventTree(eventId: Types.ObjectId | string) {
    await syncEvent(eventId)
    const depts = await Department.find({ eventId, chatChannelId: { $ne: null } }, { _id: 1 }).lean()
    for (const d of depts) await syncDepartment(d._id)
  }

  async function dismiss(channelId: string | null | undefined) {
    if (channelId) await nx.dismiss(channelId)
  }

  /** Fire-and-forget wrapper for route handlers: chat sync must never fail the user's action. */
  const background = (label: string, fn: () => Promise<unknown>) => {
    fn().catch((err) => log(`[nexconn] ${label} failed; it will be retried on the next sync`, err))
  }

  return { syncEvent, syncDepartment, syncEventTree, dismiss, background }
}

export type ChannelSync = ReturnType<typeof createChannelSync>
