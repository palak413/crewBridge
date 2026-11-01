import { priorityMeta } from '../../lib/data/labels'
import type { Task, TaskPriority } from '../../lib/data/types'

export type TaskView = 'all' | 'mine' | 'available' | 'completed'

export interface BoardFilters {
  view: TaskView
  eventId: string
  departmentId: string
  priority: '' | TaskPriority
  query: string
}

/** "My tasks" = assigned to me or created by me. "Available" = unassigned and not done. */
export function matchesView(task: Task, view: TaskView, meId: string) {
  switch (view) {
    case 'mine':
      return task.assigneeId === meId || task.createdBy === meId
    case 'available':
      return task.assigneeId === null && task.status !== 'completed'
    case 'completed':
      return task.status === 'completed'
    default:
      return true
  }
}

export function applyFilters(tasks: Task[], f: BoardFilters, meId: string) {
  const q = f.query.trim().toLowerCase()
  return tasks.filter(
    (t) =>
      matchesView(t, f.view, meId) &&
      (!f.eventId || t.eventId === f.eventId) &&
      (!f.departmentId || t.departmentId === f.departmentId) &&
      (!f.priority || t.priority === f.priority) &&
      (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
  )
}

/** Urgent first, then earliest due, then newest. */
export function sortForBoard(a: Task, b: Task) {
  const p = priorityMeta[a.priority].rank - priorityMeta[b.priority].rank
  if (p !== 0) return p
  const ad = a.dueAt ? Date.parse(a.dueAt) : Infinity
  const bd = b.dueAt ? Date.parse(b.dueAt) : Infinity
  if (ad !== bd) return ad - bd
  return Date.parse(b.createdAt) - Date.parse(a.createdAt)
}
