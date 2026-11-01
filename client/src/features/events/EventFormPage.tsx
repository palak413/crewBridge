import { ArrowLeft, Check, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EventCover } from '../../components/data/EventCover'
import { Alert } from '../../components/ui/Alert'
import { Button, ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, Input } from '../../components/ui/Field'
import { LoadError, LoadingRows } from '../../components/ui/LoadState'
import { Select, Textarea } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toastContext'
import { cn } from '../../lib/cn'
import { coverMeta, eventStatusMeta } from '../../lib/data/labels'
import { useCreateEvent, useEvent, useUpdateEvent } from '../../lib/data/queries'
import { coverThemes, eventInputSchema, eventStatuses, type EventInput } from '../../lib/data/schemas'
import type { CoverTheme, CrewEvent, EventStatus } from '../../lib/data/types'
import { fromLocalInput, toLocalInput } from '../../lib/format'
import { submitErrors, validate, type FieldErrors } from '../../lib/forms'
import { useAccess } from '../../lib/data/permissions'

interface FormValues {
  title: string
  description: string
  startAt: string
  endAt: string
  location: string
  status: EventStatus
  coverTheme: CoverTheme
  coverUrl: string
}

function defaults(event?: CrewEvent): FormValues {
  if (event) {
    return {
      title: event.title,
      description: event.description,
      startAt: toLocalInput(event.startAt),
      endAt: toLocalInput(event.endAt),
      location: event.location,
      status: event.status,
      coverTheme: event.coverTheme,
      coverUrl: event.coverUrl ?? '',
    }
  }
  const start = new Date()
  start.setDate(start.getDate() + 7)
  start.setHours(9, 0, 0, 0)
  const end = new Date(start)
  end.setHours(18)
  return {
    title: '',
    description: '',
    startAt: toLocalInput(start.toISOString()),
    endAt: toLocalInput(end.toISOString()),
    location: '',
    status: 'draft',
    coverTheme: 'forest',
    coverUrl: '',
  }
}

function EventForm({ event }: { event?: CrewEvent }) {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const [values, setValues] = useState<FormValues>(() => defaults(event))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _omit, ...rest }) => rest)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const input: EventInput = {
      ...values,
      startAt: fromLocalInput(values.startAt) ?? '',
      endAt: fromLocalInput(values.endAt) ?? '',
    }
    const checked = validate(eventInputSchema, input)
    if (checked.errors) {
      setErrors(checked.errors)
      return
    }
    try {
      const saved = event ? await update.mutateAsync({ id: event.id, input }) : await create.mutateAsync(input)
      toast({ message: event ? 'Event updated' : 'Event created' })
      navigate(`/app/events/${saved.id}`, { replace: !event })
    } catch (err) {
      const { fields, message } = submitErrors(err)
      setErrors(fields)
      setFormError(message)
    }
  }

  const backTo = event ? `/app/events/${event.id}` : '/app/events'

  return (
    <form noValidate onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-strong hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> {event ? 'Back to event' : 'Back to events'}
        </Link>
        <p className="mt-3 text-[22px] font-semibold tracking-[-0.015em] text-ink">{event ? 'Edit event' : 'Create event'}</p>
        <p className="mt-1 text-sm text-muted-strong">
          {event ? 'Changes are visible to everyone working on this event.' : 'You can add departments and volunteers right after creating it.'}
        </p>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      <section className="rounded-card border border-line bg-surface shadow-card">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Details</h2>
        <div className="space-y-4 p-5">
          <Field label="Event name" error={errors.title}>
            {(p) => <Input {...p} value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. TechFest 2026" data-autofocus />}
          </Field>
          <Field label="Description" hint="What it is, who it's for and anything volunteers should know." error={errors.description}>
            {(p) => <Textarea {...p} value={values.description} onChange={(e) => set('description', e.target.value)} rows={4} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" error={errors.startAt}>
              {(p) => <Input {...p} type="datetime-local" value={values.startAt} onChange={(e) => set('startAt', e.target.value)} />}
            </Field>
            <Field label="Ends" error={errors.endAt}>
              {(p) => <Input {...p} type="datetime-local" value={values.endAt} onChange={(e) => set('endAt', e.target.value)} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location" error={errors.location}>
              {(p) => <Input {...p} value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="Venue or address" />}
            </Field>
            <Field label="Status" error={errors.status}>
              {(p) => (
                <Select {...p} value={values.status} onChange={(e) => set('status', e.target.value as EventStatus)}>
                  {eventStatuses.map((s) => (
                    <option key={s} value={s}>
                      {eventStatusMeta[s].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface shadow-card">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Cover</h2>
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <fieldset>
              <legend className="text-[13px] font-medium text-ink-soft">Color theme</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {coverThemes.map((t) => {
                  const on = values.coverTheme === t
                  return (
                    <label
                      key={t}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-control border px-2.5 py-1.5 text-[13px] transition-colors',
                        on ? 'border-primary bg-sage/40 text-ink' : 'border-line-strong text-ink-soft hover:border-[#cdd5cf]',
                      )}
                    >
                      <input type="radio" name="coverTheme" value={t} checked={on} onChange={() => set('coverTheme', t)} className="sr-only" />
                      <span aria-hidden className={cn('flex size-4 items-center justify-center rounded-full', coverMeta[t].className)}>
                        {on && <Check className="size-2.5" strokeWidth={3} />}
                      </span>
                      {coverMeta[t].label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <Field label="Cover image URL (optional)" hint="An https:// image link. Image uploads arrive with the backend." error={errors.coverUrl}>
              {(p) => <Input {...p} type="url" inputMode="url" value={values.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" />}
            </Field>
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink-soft">Preview</p>
            <EventCover
              key={values.coverUrl}
              theme={values.coverTheme}
              url={/^https:\/\/\S+$/i.test(values.coverUrl) ? values.coverUrl : null}
              title={values.title || 'Event'}
              className="mt-2 h-28 w-full rounded-card border border-line"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => navigate(backTo)}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {event ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  )
}

export function EventFormPage() {
  const { eventId } = useParams()
  const can = useAccess()
  if (!eventId) return can.me && !can.canCreateEvent ? <NotAllowed message="Only organizers can create events." /> : <EventForm />
  return <EditEvent id={eventId} />
}

function EditEvent({ id }: { id: string }) {
  const event = useEvent(id)
  const can = useAccess()
  if (event.isPending) return <LoadingRows rows={4} label="Loading event" />
  if (event.error) return <LoadError error={event.error} onRetry={() => void event.refetch()} />
  if (can.me && !can.canManageEvent(event.data)) return <NotAllowed message="Only this event’s organizer can edit it." to={`/app/events/${event.data.id}`} />
  return <EventForm key={event.data.id} event={event.data} />
}

function NotAllowed({ message, to = '/app/events' }: { message: string; to?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <EmptyState
        icon={Lock}
        title="You can’t do that"
        description={message}
        action={
          <ButtonLink to={to} variant="secondary" size="sm" leadingIcon={<ArrowLeft className="size-3.5" aria-hidden />}>
            Go back
          </ButtonLink>
        }
        className="py-16"
      />
    </div>
  )
}
