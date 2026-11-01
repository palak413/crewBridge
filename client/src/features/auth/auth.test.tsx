import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

describe('LoginPage', () => {
  it('shows validation errors without calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { user } = await renderRoute('/login')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('toggles password visibility', async () => {
    const { user } = await renderRoute('/login')
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('reports an unreachable server instead of pretending to sign in', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const { user, router } = await renderRoute('/login')
    await user.type(screen.getByLabelText('Email'), 'ana@example.org')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/couldn't reach the CrewBridge server/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows a credential error on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const { user } = await renderRoute('/login')
    await user.type(screen.getByLabelText('Email'), 'ana@example.org')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/don’t match an account/)).toBeInTheDocument()
  })

  it('navigates to the workspace only after the server confirms', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            name: 'Ana',
            email: 'ana@example.org',
            role: 'organizer',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    const { user, router } = await renderRoute('/login')
    await user.type(screen.getByLabelText('Email'), 'ana@example.org')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
  })
})

describe('RegisterPage', () => {
  it('requires a role before continuing', async () => {
    const { user } = await renderRoute('/register')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Choose how you’ll use CrewBridge')).toBeInTheDocument()
  })

  it('moves from role selection to details and validates the password rules', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { user } = await renderRoute('/register')
    await user.click(screen.getByRole('radio', { name: /Team leader/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Signing up as team leader.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Full name'), 'Dev Patel')
    await user.type(screen.getByLabelText('Email'), 'dev@example.org')
    await user.type(screen.getByLabelText('Password'), 'abcdefgh')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/at least 8 characters with a letter and a number/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preselects a role from the URL and submits to the real endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = await renderRoute('/register?role=volunteer')
    expect(screen.getByRole('radio', { name: /Volunteer/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByLabelText('Full name'), 'Ana Ruiz')
    await user.type(screen.getByLabelText('Email'), 'ana@example.org')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/couldn't reach the CrewBridge server/i)).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/register')
    expect(JSON.parse(String(init?.body))).toEqual({
      role: 'volunteer',
      name: 'Ana Ruiz',
      email: 'ana@example.org',
      password: 'secret123',
    })
  })
})
