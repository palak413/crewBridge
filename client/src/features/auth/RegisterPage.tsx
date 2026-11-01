import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, ClipboardList, HandHeart, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { ApiError } from '../../lib/api/client'
import { setMode } from '../../lib/session/mode'
import { cn } from '../../lib/cn'
import { homePathFor, register as registerAccount } from './authApi'
import { AuthLayout } from './AuthLayout'
import { passwordRules, registerSchema, roles, type RegisterInput, type Role } from './schemas'

const roleOptions: Record<Role, { title: string; body: string; icon: LucideIcon }> = {
  organizer: {
    title: 'Organizer',
    body: 'Create events, manage volunteers and run operations.',
    icon: ClipboardList,
  },
  leader: {
    title: 'Team leader',
    body: 'Lead a department, assign tasks and keep your team in sync.',
    icon: Users,
  },
  volunteer: {
    title: 'Volunteer',
    body: 'Join events, pick up tasks and share your availability.',
    icon: HandHeart,
  },
}

function isRole(v: string | null): v is Role {
  return v !== null && (roles as readonly string[]).includes(v)
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialRole = params.get('role')
  const [step, setStep] = useState<'role' | 'details'>('role')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    trigger,
    control,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: isRole(initialRole) ? initialRole : undefined,
      name: '',
      email: '',
      password: '',
    },
  })

  const role = useWatch({ control, name: 'role' })
  const password = useWatch({ control, name: 'password' }) ?? ''

  const continueToDetails = async () => {
    if (await trigger('role')) setStep('details')
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { user } = await registerAccount(values)
      setMode('live')
      navigate(homePathFor(user.role), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setError('email', {
          message: 'An account with this email already exists',
        })
      } else if (err instanceof ApiError && err.fields) {
        for (const [key, message] of Object.entries(err.fields)) {
          if (key === 'name' || key === 'email' || key === 'password') setError(key, { message })
        }
        setFormError(err.message)
      } else if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    }
  })

  const footer = (
    <>
      Already have an account?{' '}
      <Link to="/login" className="font-medium text-primary hover:underline">
        Sign in
      </Link>
    </>
  )

  if (step === 'role') {
    return (
      <AuthLayout title="Create your account" subtitle="First, how will you use CrewBridge?" footer={footer}>
        <fieldset>
          <legend className="sr-only">Choose your role</legend>
          <div className="space-y-2.5" role="radiogroup" aria-describedby={errors.role ? 'role-error' : undefined}>
            {roles.map((r) => {
              const { title, body, icon: Icon } = roleOptions[r]
              const selected = role === r
              return (
                <label
                  key={r}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-card border bg-surface p-3.5 transition-[border-color,background-color,box-shadow] duration-150',
                    selected ? 'border-primary bg-sage/40 ring-3 ring-primary/10' : 'border-line-strong hover:border-[#cdd5cf]',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={selected}
                    onChange={() =>
                      setValue('role', r, {
                        shouldValidate: submitCount > 0 || Boolean(errors.role),
                      })
                    }
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-control border',
                      selected ? 'border-primary/20 bg-surface text-primary' : 'border-line bg-canvas text-muted-strong',
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{title}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-muted-strong">{body}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface',
                    )}
                  >
                    {selected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </label>
              )
            })}
          </div>
          {errors.role && (
            <p id="role-error" role="alert" className="mt-2 text-xs font-medium text-danger">
              {errors.role.message}
            </p>
          )}
        </fieldset>
        <Button size="lg" className="mt-5 w-full" onClick={continueToDetails}>
          Continue
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Your details" subtitle={`Signing up as ${roleOptions[role].title.toLowerCase()}.`} footer={footer}>
      <button
        type="button"
        onClick={() => setStep('role')}
        className="-mt-3 mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-strong hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Change role
      </button>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Full name" error={errors.name?.message}>
          {(p) => <Input {...p} {...register('name')} autoComplete="name" placeholder="Priya Sharma" />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" placeholder="you@organization.org" />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="new-password" placeholder="Create a password" />}
        </Field>
        <ul aria-label="Password requirements" className="flex flex-wrap gap-x-4 gap-y-1">
          {passwordRules.map((rule) => {
            const ok = rule.test(password)
            return (
              <li key={rule.id} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-success' : 'text-muted-strong')}>
                <Check aria-hidden className={cn('size-3.5', ok ? 'opacity-100' : 'opacity-35')} strokeWidth={2.5} />
                {rule.label}
                <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
              </li>
            )
          })}
        </ul>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
