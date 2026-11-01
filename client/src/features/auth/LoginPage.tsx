import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { ApiError } from '../../lib/api/client'
import { setMode } from '../../lib/session/mode'
import { homePathFor, login } from './authApi'
import { AuthLayout } from './AuthLayout'
import { loginSchema, type LoginInput } from './schemas'

export function LoginPage() {
  const navigate = useNavigate()
  const state = useLocation().state as {
    from?: string
    expired?: boolean
  } | null
  const next = state?.from?.startsWith('/app') ? state.from : null
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { user } = await login(values)
      setMode('live')
      navigate(next ?? homePathFor(user.role), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') setFormError('That email and password don’t match an account.')
      else if (err instanceof ApiError) setFormError(err.message)
      else setFormError('Something went wrong. Please try again.')
    }
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CrewBridge workspace."
      footer={
        <>
          New to CrewBridge?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {state?.expired && !formError && <Alert tone="info">Your session has ended. Please sign in again.</Alert>}
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" placeholder="you@organization.org" />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="current-password" placeholder="Your password" />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <button
          type="button"
          onClick={() => {
            setMode('demo')
            navigate('/app')
          }}
          className="text-[13px] font-medium text-primary hover:underline"
        >
          Explore the demo workspace
        </button>
        <p className="mt-1 text-xs text-muted-strong">Sample data stored only in your browser. No account needed.</p>
      </div>
    </AuthLayout>
  )
}
