import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

describe('LandingPage', () => {
  it('renders the hero and primary calls to action', async () => {
    await renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Bring your people, plans and progress together.' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Get started/ })[0]).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Explore the platform' })).toHaveAttribute('href', '#product')
  })

  it('switches use-case tabs', async () => {
    const { user } = await renderRoute('/')
    await user.click(screen.getByRole('tab', { name: /Conferences/ }))
    expect(screen.getByRole('tab', { name: /Conferences/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Keep every room, session and speaker on schedule.')).toBeInTheDocument()
  })

  it('renders a 404 for unknown routes', async () => {
    await renderRoute('/nope')
    expect(screen.getByRole('heading', { name: "This page doesn't exist" })).toBeInTheDocument()
  })
})
