import type { CrewEvent, Department, Task } from '../../lib/data/types'

export interface EventStats {
  departments: number
  volunteers: number
  total: number
  completed: number
  open: number
  progress: number
}

export function statsFor(event: CrewEvent, departments: Department[], tasks: Task[]): EventStats {
  const own = tasks.filter((t) => t.eventId === event.id)
  const completed = own.filter((t) => t.status === 'completed').length
  return {
    departments: departments.filter((d) => d.eventId === event.id).length,
    volunteers: event.memberIds.length,
    total: own.length,
    completed,
    open: own.length - completed,
    progress: own.length ? Math.round((completed / own.length) * 100) : 0,
  }
}
