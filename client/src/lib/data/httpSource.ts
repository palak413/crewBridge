import { apiRequest } from '../api/client'
import type { DataSource } from './source'
import type { Activity, CrewEvent, Department, Person, Task } from './types'

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()
  return s ? `?${s}` : ''
}

/** Live data source backed by the CrewBridge API. Same contract and error codes as the demo source. */
export function createHttpSource(): DataSource {
  const get = <T>(path: string) => apiRequest<T>(path)
  const send = <T>(method: string, path: string, body?: unknown) => apiRequest<T>(path, { method, body })

  return {
    kind: 'http',

    currentUser: async () => (await get<{ user: Person }>('/auth/me')).user,

    listEvents: () => get<CrewEvent[]>('/events'),
    getEvent: (id) => get<CrewEvent>(`/events/${encodeURIComponent(id)}`),
    createEvent: (input) => send<CrewEvent>('POST', '/events', input),
    updateEvent: (id, input) => send<CrewEvent>('PUT', `/events/${encodeURIComponent(id)}`, input),
    deleteEvent: (id) => send<void>('DELETE', `/events/${encodeURIComponent(id)}`),
    addEventMembers: (eventId, personIds) => send<CrewEvent>('POST', `/events/${encodeURIComponent(eventId)}/members`, { personIds }),
    removeEventMember: (eventId, personId) => send<CrewEvent>('DELETE', `/events/${encodeURIComponent(eventId)}/members/${encodeURIComponent(personId)}`),

    listDepartments: (eventId) => get<Department[]>(`/departments${q({ eventId })}`),
    createDepartment: (eventId, input) => send<Department>('POST', `/events/${encodeURIComponent(eventId)}/departments`, input),
    updateDepartment: (id, input) => send<Department>('PUT', `/departments/${encodeURIComponent(id)}`, input),
    deleteDepartment: (id) => send<void>('DELETE', `/departments/${encodeURIComponent(id)}`),
    setDepartmentMembers: (id, personIds) => send<Department>('PUT', `/departments/${encodeURIComponent(id)}/members`, { personIds }),

    listPeople: () => get<Person[]>('/people'),
    createVolunteer: (input) => send<Person>('POST', '/people', input),
    updateVolunteer: (id, input) => send<Person>('PUT', `/people/${encodeURIComponent(id)}`, input),
    setAvailability: (id, availability) =>
      send<Person>('PATCH', `/people/${encodeURIComponent(id)}/availability`, {
        availability,
      }),

    listTasks: (filter = {}) => get<Task[]>(`/tasks${q({ ...filter })}`),
    createTask: (input) => send<Task>('POST', '/tasks', input),
    updateTask: (id, input) => send<Task>('PUT', `/tasks/${encodeURIComponent(id)}`, input),
    moveTask: (id, status) =>
      send<Task>('PATCH', `/tasks/${encodeURIComponent(id)}/status`, {
        status,
      }),
    deleteTask: (id) => send<void>('DELETE', `/tasks/${encodeURIComponent(id)}`),

    listActivity: (limit = 20) => get<Activity[]>(`/activity?limit=${limit}`),
  }
}
