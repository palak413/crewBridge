import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { Select, Textarea } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { availabilityMeta, priorityMeta, taskStatusMeta } from '../../lib/data/labels'
import { useCreateTask, useUpdateTask } from '../../lib/data/queries'
import { taskInputSchema, taskPriorities, taskStatuses, type TaskInput } from '../../lib/data/schemas'
import type { CrewEvent, Department, Person, Task, TaskPriority, TaskStatus } from '../../lib/data/types'
import { formatDateTime, fromLocalInput, timeAgo, toLocalInput } from '../../lib/format'
import { submitErrors, validate, type FieldErrors } from '../../lib/forms'

interface Values {
  eventId: string
  departmentId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assigneeId: string
  dueAt: string
}

/** Create or edit a task. Mount only while open so its state resets. */
export function TaskDialog({
  task,
  defaults,
  events,
  departments,
  people,
  onClose,
  onDelete,
  readOnly = false,
}: {
  task?: Task
  defaults?: Partial<Pick<Values, 'eventId' | 'departmentId' | 'status'>>
  events: CrewEvent[]
  departments: Department[]
  people: Person[]
  onClose: () => void
  onDelete?: () => void
  /** View-only: the user may not edit this task (the server would refuse). */
  readOnly?: boolean
}) {
  const toast = useToast()
  const create = useCreateTask()
  const update = useUpdateTask()
  const [values, setValues] = useState<Values>(() => ({
    eventId: task?.eventId ?? defaults?.eventId ?? events.find((e) => e.status === 'live')?.id ?? events[0]?.id ?? '',
    departmentId: task?.departmentId ?? defaults?.departmentId ?? '',
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? defaults?.status ?? 'todo',
    assigneeId: task?.assigneeId ?? '',
    dueAt: toLocalInput(task?.dueAt),
  }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const event = events.find((e) => e.id === values.eventId)
  const eventDepts = departments.filter((d) => d.eventId === values.eventId)
  const dept = eventDepts.find((d) => d.id === values.departmentId)

  // Assignee options: event members; department members first when a department is chosen.
  const assignees = useMemo(() => {
    const members = people.filter((p) => event?.memberIds.includes(p.id))
    if (!dept) return { primary: members, rest: [] as Person[] }
    return {
      primary: members.filter((p) => dept.memberIds.includes(p.id)),
      rest: members.filter((p) => !dept.memberIds.includes(p.id)),
    }
  }, [people, event, dept])

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value }
      // Changing the event invalidates department and assignee choices.
      if (key === 'eventId') {
        next.departmentId = ''
        next.assigneeId = ''
      }
      return next
    })
    if (errors[key]) setErrors(({ [key]: _omit, ...rest }) => rest)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const input: TaskInput = {
      eventId: values.eventId,
      departmentId: values.departmentId || null,
      title: values.title,
      description: values.description,
      priority: values.priority,
      status: values.status,
      assigneeId: values.assigneeId || null,
      dueAt: fromLocalInput(values.dueAt),
    }
    const checked = validate(taskInputSchema, input)
    if (checked.errors) return setErrors(checked.errors)
    try {
      if (task) await update.mutateAsync({ id: task.id, input })
      else await create.mutateAsync(input)
      toast({ message: task ? 'Task updated' : 'Task created' })
      onClose()
    } catch (err) {
      const { fields, message } = submitErrors(err)
      setErrors(fields)
      setFormError(message)
    }
  }

  const option = (p: Person) => (
    <option key={p.id} value={p.id}>
      {p.name} — {availabilityMeta[p.availability].label}
    </option>
  )

  return (
    <Dialog
      open
      onClose={onClose}
      title={readOnly ? 'Task details' : task ? 'Edit task' : 'New task'}
      description={task ? `Created ${timeAgo(task.createdAt)}${task.completedAt ? ` · completed ${formatDateTime(task.completedAt)}` : ''}` : undefined}
      size="lg"
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            {task && onDelete && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger-soft hover:text-danger sm:mr-auto"
                onClick={onDelete}
                leadingIcon={<Trash2 className="size-4" aria-hidden />}
              >
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="task-form" loading={create.isPending || update.isPending}>
              {task ? 'Save changes' : 'Create task'}
            </Button>
          </>
        )
      }
    >
      <form id="task-form" noValidate onSubmit={onSubmit} className="space-y-4">
        <fieldset disabled={readOnly} className="contents">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Field label="Title" error={errors.title}>
            {(p) => <Input {...p} data-autofocus value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to be done?" />}
          </Field>
          <Field label="Description" error={errors.description}>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Context, location, anything the assignee should know"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event" error={errors.eventId}>
              {(p) => (
                <Select {...p} value={values.eventId} onChange={(e) => set('eventId', e.target.value)}>
                  {events.length === 0 && <option value="">Create an event first</option>}
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Department" error={errors.departmentId}>
              {(p) => (
                <Select {...p} value={values.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                  <option value="">No department</option>
                  {eventDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Priority" error={errors.priority}>
              {(p) => (
                <Select {...p} value={values.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
                  {taskPriorities.map((pr) => (
                    <option key={pr} value={pr}>
                      {priorityMeta[pr].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Status" error={errors.status}>
              {(p) => (
                <Select {...p} value={values.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
                  {taskStatuses.map((s) => (
                    <option key={s} value={s}>
                      {taskStatusMeta[s].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Assignee" hint={event && event.memberIds.length === 0 ? 'Add volunteers to this event to assign tasks.' : undefined} error={errors.assigneeId}>
              {(p) => (
                <Select {...p} value={values.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
                  <option value="">Unassigned (available to pick up)</option>
                  {assignees.rest.length > 0 ? (
                    <>
                      <optgroup label={dept ? `${dept.name} team` : 'Event volunteers'}>{assignees.primary.map(option)}</optgroup>
                      <optgroup label="Other event volunteers">{assignees.rest.map(option)}</optgroup>
                    </>
                  ) : (
                    assignees.primary.map(option)
                  )}
                </Select>
              )}
            </Field>
            <Field label="Due" error={errors.dueAt}>
              {(p) => <Input {...p} type="datetime-local" value={values.dueAt} onChange={(e) => set('dueAt', e.target.value)} />}
            </Field>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}
