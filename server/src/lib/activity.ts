import type { ActivityVerb, TaskStatus } from '@crewbridge/shared'
import type { Types } from 'mongoose'
import { Activity } from '../models'

export const statusLabel: Record<TaskStatus, string> = { todo: 'To do', in_progress: 'In progress', completed: 'Completed' }

export function logActivity(
  actorId: Types.ObjectId,
  verb: ActivityVerb,
  target: string,
  detail: string | null,
  eventId: Types.ObjectId | null,
) {
  return Activity.create({ actorId, verb, target, detail, eventId })
}
