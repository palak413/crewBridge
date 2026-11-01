import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { Select, Textarea } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { useCreateDepartment, useUpdateDepartment } from '../../lib/data/queries'
import { departmentInputSchema, type DepartmentInput } from '../../lib/data/schemas'
import type { Department, Person } from '../../lib/data/types'
import { submitErrors, validate, type FieldErrors } from '../../lib/forms'

/** Create or edit a department. Mount only while open so state resets each time. */
export function DepartmentDialog({
  eventId,
  department,
  candidates,
  onClose,
  canChangeLeader = true,
}: {
  eventId: string
  department?: Department
  /** People who can lead it: the event's members. */
  candidates: Person[]
  onClose: () => void
  /** Only the organizer can change who leads a department. */
  canChangeLeader?: boolean
}) {
  const toast = useToast()
  const create = useCreateDepartment()
  const update = useUpdateDepartment()
  const [values, setValues] = useState<DepartmentInput>({
    name: department?.name ?? '',
    description: department?.description ?? '',
    leaderId: department?.leaderId ?? null,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const checked = validate(departmentInputSchema, values)
    if (checked.errors) return setErrors(checked.errors)
    try {
      if (department) await update.mutateAsync({ id: department.id, input: values })
      else await create.mutateAsync({ eventId, input: values })
      toast({
        message: department ? 'Department updated' : `Added ${values.name.trim()}`,
      })
      onClose()
    } catch (err) {
      const { fields, message } = submitErrors(err)
      setErrors(fields)
      setFormError(message)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={department ? 'Edit department' : 'Add department'}
      description="Departments group volunteers and tasks. Each gets its own team channel once messaging is live."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" loading={create.isPending || update.isPending}>
            {department ? 'Save changes' : 'Add department'}
          </Button>
        </>
      }
    >
      <form id="department-form" noValidate onSubmit={onSubmit} className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} data-autofocus value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="e.g. Registration" />}
        </Field>
        <Field label="Description" error={errors.description}>
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="What this team is responsible for"
            />
          )}
        </Field>
        <Field
          label="Team leader"
          hint={!canChangeLeader ? 'Only the organizer can change the leader.' : candidates.length === 0 ? 'Add volunteers to the event to choose a leader.' : undefined}
          error={errors.leaderId}
        >
          {(p) => (
            <Select {...p} disabled={!canChangeLeader} value={values.leaderId ?? ''} onChange={(e) => setValues({ ...values, leaderId: e.target.value || null })}>
              <option value="">No leader yet</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Dialog>
  )
}
