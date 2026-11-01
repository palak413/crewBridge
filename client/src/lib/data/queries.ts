import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataSource } from './dataContext'
import type { DepartmentInput, EventInput, TaskInput, VolunteerInput } from './schemas'
import type { Availability, TaskFilter, TaskStatus } from './types'

/**
 * Query/mutation hooks — the only way UI code reads or writes data.
 * Every mutation invalidates the whole `cb` namespace: datasets are small and this keeps
 * derived views (dashboard, boards, directory) consistent without hand-maintained cache updates.
 */

export const keys = {
  all: ['cb'] as const,
  me: ['cb', 'me'] as const,
  events: ['cb', 'events'] as const,
  event: (id: string) => ['cb', 'events', id] as const,
  departments: (eventId?: string) => ['cb', 'departments', eventId ?? 'all'] as const,
  people: ['cb', 'people'] as const,
  tasks: (filter: TaskFilter = {}) => ['cb', 'tasks', filter] as const,
  activity: (limit: number) => ['cb', 'activity', limit] as const,
}

export function useCurrentUser() {
  const src = useDataSource()
  return useQuery({ queryKey: keys.me, queryFn: () => src.currentUser() })
}

export function useEvents() {
  const src = useDataSource()
  return useQuery({ queryKey: keys.events, queryFn: () => src.listEvents() })
}

export function useEvent(id: string) {
  const src = useDataSource()
  return useQuery({
    queryKey: keys.event(id),
    queryFn: () => src.getEvent(id),
    retry: false,
  })
}

export function useDepartments(eventId?: string) {
  const src = useDataSource()
  return useQuery({
    queryKey: keys.departments(eventId),
    queryFn: () => src.listDepartments(eventId),
  })
}

export function usePeople() {
  const src = useDataSource()
  return useQuery({ queryKey: keys.people, queryFn: () => src.listPeople() })
}

export function useTasks(filter: TaskFilter = {}) {
  const src = useDataSource()
  return useQuery({
    queryKey: keys.tasks(filter),
    queryFn: () => src.listTasks(filter),
  })
}

export function useActivity(limit = 8) {
  const src = useDataSource()
  return useQuery({
    queryKey: keys.activity(limit),
    queryFn: () => src.listActivity(limit),
  })
}

function useInvalidatingMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useCreateEvent() {
  const src = useDataSource()
  return useInvalidatingMutation((input: EventInput) => src.createEvent(input))
}
export function useUpdateEvent() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, input }: { id: string; input: EventInput }) => src.updateEvent(id, input))
}
export function useDeleteEvent() {
  const src = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => src.deleteEvent(id),
    onSuccess: (_r, id) => qc.removeQueries({ queryKey: keys.event(id) }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
export function useAddEventMembers() {
  const src = useDataSource()
  return useInvalidatingMutation(({ eventId, personIds }: { eventId: string; personIds: string[] }) => src.addEventMembers(eventId, personIds))
}
export function useRemoveEventMember() {
  const src = useDataSource()
  return useInvalidatingMutation(({ eventId, personId }: { eventId: string; personId: string }) => src.removeEventMember(eventId, personId))
}

export function useCreateDepartment() {
  const src = useDataSource()
  return useInvalidatingMutation(({ eventId, input }: { eventId: string; input: DepartmentInput }) => src.createDepartment(eventId, input))
}
export function useUpdateDepartment() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, input }: { id: string; input: DepartmentInput }) => src.updateDepartment(id, input))
}
export function useDeleteDepartment() {
  const src = useDataSource()
  return useInvalidatingMutation((id: string) => src.deleteDepartment(id))
}
export function useSetDepartmentMembers() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, personIds }: { id: string; personIds: string[] }) => src.setDepartmentMembers(id, personIds))
}

export function useCreateVolunteer() {
  const src = useDataSource()
  return useInvalidatingMutation((input: VolunteerInput) => src.createVolunteer(input))
}
export function useUpdateVolunteer() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, input }: { id: string; input: VolunteerInput }) => src.updateVolunteer(id, input))
}
export function useSetAvailability() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, availability }: { id: string; availability: Availability }) => src.setAvailability(id, availability))
}

export function useCreateTask() {
  const src = useDataSource()
  return useInvalidatingMutation((input: TaskInput) => src.createTask(input))
}
export function useUpdateTask() {
  const src = useDataSource()
  return useInvalidatingMutation(({ id, input }: { id: string; input: TaskInput }) => src.updateTask(id, input))
}
export function useDeleteTask() {
  const src = useDataSource()
  return useInvalidatingMutation((id: string) => src.deleteTask(id))
}

/** Moving a card updates the cache optimistically so drag-and-drop feels instant. */
export function useMoveTask() {
  const src = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => src.moveTask(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['cb', 'tasks'] })
      const snapshots = qc.getQueriesData<{ id: string; status: TaskStatus }[]>({ queryKey: ['cb', 'tasks'] })
      for (const [key, data] of snapshots) {
        if (data)
          qc.setQueryData(
            key,
            data.map((t) => (t.id === id ? { ...t, status } : t)),
          )
      }
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useResetDemo() {
  const src = useDataSource()
  return useInvalidatingMutation(async () => {
    await src.resetDemo?.()
  })
}
