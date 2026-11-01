import { availabilities, coverThemes, eventStatuses, roles, taskPriorities, taskStatuses } from '@crewbridge/shared'
import mongoose, { Schema, type InferSchemaType, type Types } from 'mongoose'
import { apiJson } from './plugin'

const { ObjectId } = Schema.Types

// ── User ───────────────────────────────────────────────────────────────
// A user without passwordHash is a directory entry created by an organizer/leader;
// registering with that email claims the account.
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, default: null },
    phone: { type: String, default: null },
    role: { type: String, enum: roles, required: true },
    skills: { type: [String], default: [] },
    availability: { type: String, enum: availabilities, default: 'available' },
    availabilityUpdatedAt: { type: Date, default: () => new Date() },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
)
apiJson(userSchema)
userSchema.set('toJSON', {
  ...userSchema.get('toJSON'),
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = String(ret._id)
    ret.claimed = !!ret.passwordHash
    delete ret._id
    delete ret.passwordHash
    delete ret.updatedAt
    return ret
  },
})

// ── Event ──────────────────────────────────────────────────────────────
const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    coverTheme: { type: String, enum: coverThemes, default: 'forest' },
    coverUrl: { type: String, default: null },
    status: { type: String, enum: eventStatuses, default: 'draft' },
    organizerId: { type: ObjectId, ref: 'User', required: true, index: true },
    memberIds: { type: [{ type: ObjectId, ref: 'User' }], default: [], index: true },
    /** Nexconn group channel id, created on first use. */
    chatChannelId: { type: String, default: null },
    /** Users currently joined to the Nexconn group (reconciled against authorized members). */
    chatMemberIds: { type: [{ type: ObjectId, ref: 'User' }], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
)
apiJson(eventSchema)

// ── Department ─────────────────────────────────────────────────────────
const departmentSchema = new Schema(
  {
    eventId: { type: ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    leaderId: { type: ObjectId, ref: 'User', default: null },
    memberIds: { type: [{ type: ObjectId, ref: 'User' }], default: [] },
    chatChannelId: { type: String, default: null },
    chatMemberIds: { type: [{ type: ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
departmentSchema.index({ eventId: 1, nameKey: 1 }, { unique: true })
departmentSchema.add({ nameKey: { type: String, required: true } })
departmentSchema.pre('validate', function () {
  this.set('nameKey', String(this.get('name') ?? '').trim().toLowerCase())
})
apiJson(departmentSchema)
departmentSchema.set('toJSON', {
  ...departmentSchema.get('toJSON'),
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.nameKey
    delete ret.chatMemberIds
    return ret
  },
})

// ── Task ───────────────────────────────────────────────────────────────
const taskSchema = new Schema(
  {
    eventId: { type: ObjectId, ref: 'Event', required: true, index: true },
    departmentId: { type: ObjectId, ref: 'Department', default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: taskPriorities, default: 'medium' },
    status: { type: String, enum: taskStatuses, default: 'todo' },
    assigneeId: { type: ObjectId, ref: 'User', default: null, index: true },
    dueAt: { type: Date, default: null },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
)
apiJson(taskSchema)

// ── Activity ───────────────────────────────────────────────────────────
const activitySchema = new Schema({
  at: { type: Date, default: () => new Date(), index: -1 },
  actorId: { type: ObjectId, ref: 'User', required: true },
  verb: { type: String, required: true },
  eventId: { type: ObjectId, ref: 'Event', default: null, index: true },
  target: { type: String, required: true },
  detail: { type: String, default: null },
})
apiJson(activitySchema)

export const User = mongoose.model('User', userSchema)
export const Event = mongoose.model('Event', eventSchema)
export const Department = mongoose.model('Department', departmentSchema)
export const Task = mongoose.model('Task', taskSchema)
export const Activity = mongoose.model('Activity', activitySchema)

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId }
export type EventDoc = InferSchemaType<typeof eventSchema> & { _id: Types.ObjectId }
export type DepartmentDoc = InferSchemaType<typeof departmentSchema> & { _id: Types.ObjectId }
export type TaskDoc = InferSchemaType<typeof taskSchema> & { _id: Types.ObjectId }
