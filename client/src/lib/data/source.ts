import type { DepartmentInput, EventInput, TaskInput, VolunteerInput } from './schemas'
import type { Activity, Availability, CrewEvent, Department, Person, Task, TaskFilter, TaskStatus } from './types'

/**
 * The contract every data source implements. The UI only talks to this interface
 * (through the hooks in ./queries.ts).
 *
 * - Milestone 2: `LocalDemoSource` — a browser-persisted demo workspace, clearly labelled in the UI.
 * - Milestone 3: an HTTP source backed by the Express API replaces it.
 *
 * Errors are thrown as `ApiError` with the same codes the HTTP client produces.
 */
export interface DataSource {
  readonly kind: 'local-demo' | 'http'

  currentUser(): Promise<Person>

  listEvents(): Promise<CrewEvent[]>
  getEvent(id: string): Promise<CrewEvent>
  createEvent(input: EventInput): Promise<CrewEvent>
  updateEvent(id: string, input: EventInput): Promise<CrewEvent>
  deleteEvent(id: string): Promise<void>
  addEventMembers(eventId: string, personIds: string[]): Promise<CrewEvent>
  removeEventMember(eventId: string, personId: string): Promise<CrewEvent>

  listDepartments(eventId?: string): Promise<Department[]>
  createDepartment(eventId: string, input: DepartmentInput): Promise<Department>
  updateDepartment(id: string, input: DepartmentInput): Promise<Department>
  deleteDepartment(id: string): Promise<void>
  setDepartmentMembers(id: string, personIds: string[]): Promise<Department>

  listPeople(): Promise<Person[]>
  createVolunteer(input: VolunteerInput): Promise<Person>
  updateVolunteer(id: string, input: VolunteerInput): Promise<Person>
  setAvailability(id: string, availability: Availability): Promise<Person>

  listTasks(filter?: TaskFilter): Promise<Task[]>
  createTask(input: TaskInput): Promise<Task>
  updateTask(id: string, input: TaskInput): Promise<Task>
  moveTask(id: string, status: TaskStatus): Promise<Task>
  deleteTask(id: string): Promise<void>

  listActivity(limit?: number): Promise<Activity[]>

  /** Demo-only: restore the seeded workspace. */
  resetDemo?(): Promise<void>
}
