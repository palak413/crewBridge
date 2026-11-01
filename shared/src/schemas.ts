import { z } from 'zod'

// Input validation shared by the client forms, the demo source and the API.

export const eventStatuses = ['draft', 'upcoming', 'live', 'completed'] as const
export const taskStatuses = ['todo', 'in_progress', 'completed'] as const
export const taskPriorities = ['low', 'medium', 'high', 'urgent'] as const
export const availabilities = ['available', 'busy', 'unavailable'] as const
export const coverThemes = ['forest', 'sage', 'sand', 'slate', 'clay'] as const

const isoDate = z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time')
const optionalId = z.string().min(1).nullable()

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Use at least 3 characters').max(80, 'Keep the title under 80 characters'),
    description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
    startAt: isoDate,
    endAt: isoDate,
    location: z.string().trim().min(2, 'Enter a location').max(120, 'Keep the location under 120 characters'),
    status: z.enum(eventStatuses),
    coverTheme: z.enum(coverThemes),
    coverUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'Use an https:// image URL')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
  })
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), { path: ['endAt'], message: 'End must be after the start' })
export type EventInput = z.input<typeof eventInputSchema>

export const departmentInputSchema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(40, 'Keep the name under 40 characters'),
  description: z.string().trim().max(240, 'Keep the description under 240 characters'),
  leaderId: optionalId,
})
export type DepartmentInput = z.infer<typeof departmentInputSchema>

export const taskInputSchema = z.object({
  eventId: z.string().min(1, 'Choose an event'),
  departmentId: optionalId,
  title: z.string().trim().min(3, 'Use at least 3 characters').max(120, 'Keep the title under 120 characters'),
  description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
  assigneeId: optionalId,
  dueAt: isoDate.nullable(),
})
export type TaskInput = z.infer<typeof taskInputSchema>

const skillList = z
  .array(z.string().trim().min(1).max(30))
  .max(12, 'Add at most 12 skills')
  .transform((list) => [...new Set(list.map((s) => s.toLowerCase()))])

export const volunteerInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter a full name').max(80, 'Keep the name under 80 characters'),
  email: z.string().trim().min(1, 'Enter an email address').pipe(z.email('Enter a valid email address')),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((v) => v === '' || /^[+\d][\d\s()-]{5,}$/.test(v), 'Enter a valid phone number')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  role: z.enum(['leader', 'volunteer']),
  skills: skillList,
  availability: z.enum(availabilities),
})
export type VolunteerInput = z.input<typeof volunteerInputSchema>

/** Parse "a, b ,c" into a trimmed list. */
export function splitList(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
