import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { availabilityMeta, roleLabel } from '../../lib/data/labels'
import { useCreateVolunteer, useUpdateVolunteer } from '../../lib/data/queries'
import { availabilities, splitList, volunteerInputSchema, type VolunteerInput } from '../../lib/data/schemas'
import type { Availability, Person } from '../../lib/data/types'
import { submitErrors, validate, type FieldErrors } from '../../lib/forms'

/** Add or edit a directory entry. Mount only while open so state resets. */
export function VolunteerDialog({ person, onClose, onSaved }: { person?: Person; onClose: () => void; onSaved?: (p: Person) => void }) {
  const toast = useToast()
  const create = useCreateVolunteer()
  const update = useUpdateVolunteer()
  const isOrganizer = person?.role === 'organizer'
  const [values, setValues] = useState({
    name: person?.name ?? '',
    email: person?.email ?? '',
    phone: person?.phone ?? '',
    role: (person && person.role !== 'organizer' ? person.role : 'volunteer') as 'leader' | 'volunteer',
    skills: person?.skills.join(', ') ?? '',
    availability: person?.availability ?? ('available' as Availability),
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _omit, ...rest }) => rest)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const input: VolunteerInput = {
      ...values,
      skills: splitList(values.skills),
    }
    const checked = validate(volunteerInputSchema, input)
    if (checked.errors) return setErrors(checked.errors)
    try {
      const saved = person ? await update.mutateAsync({ id: person.id, input }) : await create.mutateAsync(input)
      toast({
        message: person ? 'Profile updated' : `Added ${saved.name} to the directory`,
      })
      onSaved?.(saved)
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
      title={person ? 'Edit profile' : 'Add volunteer'}
      description={person ? undefined : 'Add someone to your directory. Email invitations and self sign-up arrive with the backend.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="volunteer-form" loading={create.isPending || update.isPending}>
            {person ? 'Save changes' : 'Add volunteer'}
          </Button>
        </>
      }
    >
      <form id="volunteer-form" noValidate onSubmit={onSubmit} className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Full name" error={errors.name}>
          {(p) => <Input {...p} data-autofocus autoComplete="off" value={values.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email}>
            {(p) => <Input {...p} type="email" autoComplete="off" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.org" />}
          </Field>
          <Field label="Phone (optional)" error={errors.phone}>
            {(p) => <Input {...p} type="tel" autoComplete="off" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98450 12345" />}
          </Field>
          <Field label="Role" error={errors.role} hint={isOrganizer ? 'Organizer role can’t be changed here.' : undefined}>
            {(p) => (
              <Select
                {...p}
                disabled={isOrganizer}
                value={isOrganizer ? 'organizer' : values.role}
                onChange={(e) => set('role', e.target.value as 'leader' | 'volunteer')}
              >
                {isOrganizer && <option value="organizer">{roleLabel.organizer}</option>}
                <option value="volunteer">{roleLabel.volunteer}</option>
                <option value="leader">{roleLabel.leader}</option>
              </Select>
            )}
          </Field>
          <Field label="Availability" error={errors.availability}>
            {(p) => (
              <Select {...p} value={values.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
                {availabilities.map((a) => (
                  <option key={a} value={a}>
                    {availabilityMeta[a].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Skills" hint="Comma separated, e.g. check-in, first aid, av" error={errors.skills}>
          {(p) => <Input {...p} value={values.skills} onChange={(e) => set('skills', e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  )
}
