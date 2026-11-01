import { createSeed } from '@crewbridge/shared'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import type { Env } from '../config/env'
import { Activity, Department, Event, Task, User } from '../models'

export const DEFAULT_DEMO_PASSWORD = 'CrewBridge2026'

/**
 * Load the shared demo workspace into MongoDB. Every record is flagged `isDemo` where the model
 * supports it, and every seeded person gets a sign-in with the same demo password.
 */
export async function seedDemo(env: Env, password = process.env.SEED_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD) {
  const ws = createSeed(new Date())
  const ids = new Map<string, Types.ObjectId>()
  const id = (key: string | null) => {
    if (key === null) return null
    if (!ids.has(key)) ids.set(key, new Types.ObjectId())
    return ids.get(key)!
  }
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds)

  await User.insertMany(
    ws.people.map((p) => ({
      _id: id(p.id),
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      skills: p.skills,
      availability: p.availability,
      availabilityUpdatedAt: p.availabilityUpdatedAt,
      createdAt: p.createdAt,
      createdBy: p.role === 'organizer' ? null : id(ws.currentUserId),
      passwordHash,
      isDemo: true,
    })),
  )
  await Event.insertMany(
    ws.events.map(({ id: key, organizerId, memberIds, isDemo: _d, ...e }) => ({
      ...e,
      _id: id(key),
      organizerId: id(organizerId),
      memberIds: memberIds.map(id),
      isDemo: true,
    })),
  )
  await Department.insertMany(
    ws.departments.map((d) => ({
      _id: id(d.id),
      eventId: id(d.eventId),
      name: d.name,
      nameKey: d.name.toLowerCase(),
      description: d.description,
      leaderId: id(d.leaderId),
      memberIds: d.memberIds.map(id),
      createdAt: d.createdAt,
    })),
  )
  await Task.insertMany(
    ws.tasks.map(({ id: key, eventId, departmentId, assigneeId, createdBy, isDemo: _d, ...t }) => ({
      ...t,
      _id: id(key),
      eventId: id(eventId),
      departmentId: id(departmentId),
      assigneeId: id(assigneeId),
      createdBy: id(createdBy),
      isDemo: true,
    })),
    { timestamps: false } as never,
  )
  await Activity.insertMany(
    ws.activity.map(({ id: _k, actorId, eventId, ...a }) => ({ ...a, actorId: id(actorId), eventId: id(eventId) })),
  )

  const pick = (role: string) => ws.people.find((p) => p.role === role)?.email
  return { password, accounts: [pick('organizer'), pick('leader'), pick('volunteer')].filter(Boolean) as string[] }
}

export async function clearAll() {
  await Promise.all([User, Event, Department, Task, Activity].map((m) => (m as typeof User).deleteMany({})))
}
