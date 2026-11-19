/**
 * Domain types shared by every data source. They mirror
 * the Mongo models in server/src/models.
 */

export type Role = 'organizer' | 'leader' | 'volunteer'
export type Availability = 'available' | 'busy' | 'unavailable'
export type EventStatus = 'draft' | 'upcoming' | 'live' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type CoverTheme = 'forest' | 'sage' | 'sand' | 'slate' | 'clay'

export interface Person {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  skills: string[]
  availability: Availability
  availabilityUpdatedAt: string
  createdAt: string
  isDemo: boolean
}

export interface CrewEvent {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  location: string
  coverTheme: CoverTheme
  coverUrl: string | null
  status: EventStatus
  organizerId: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
  isDemo: boolean
}

export interface Department {
  id: string
  eventId: string
  name: string
  description: string
  leaderId: string | null
  memberIds: string[]
  createdAt: string
}

export interface Task {
  id: string
  eventId: string
  departmentId: string | null
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assigneeId: string | null
  dueAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
  isDemo: boolean
}

export type ActivityVerb =
  | 'created_event'
  | 'updated_event'
  | 'created_department'
  | 'added_volunteer'
  | 'created_task'
  | 'assigned_task'
  | 'moved_task'
  | 'completed_task'

export interface Activity {
  id: string
  at: string
  actorId: string
  verb: ActivityVerb
  eventId: string | null
  /** Human-readable target, e.g. a task or event title. */
  target: string
  /** Optional secondary detail, e.g. the assignee's name or the new status. */
  detail: string | null
}

export interface TaskFilter {
  eventId?: string
  departmentId?: string
  assigneeId?: string
}

export interface AnalyticsOverview {
  overview: {
    totalEvents: number
    totalVolunteers: number
    totalTasks: number
    completedTasks: number
    completionRate: number
  }

  events: Record<EventStatus, number>
  tasks: Record<TaskStatus, number>

  volunteers: {
    total: number
    availability: Record<Availability, number>
    roles: Record<Role, number>
  }

  departments: {
    id: string
    name: string
    eventId: string
    volunteerCount: number
    taskCount: number
    completedTasks: number
  }[]

  recentActivity: Activity[]
}