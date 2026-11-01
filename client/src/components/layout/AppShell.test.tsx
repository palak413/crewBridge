import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { navItemFor } from '../../app/navigation'
import { renderRoute } from '../../test/renderRoute'

describe('AppShell', () => {
  it('renders the overview with sidebar navigation and metrics computed from workspace data', async () => {
    await renderRoute('/app')
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
    for (const label of ['Overview', 'My Events', 'Tasks', 'Volunteers', 'Messages', 'Analytics']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
    const metrics = screen.getByRole('region', { name: 'Key metrics' })
    // Seed: 2 live/upcoming events, 15 non-organizer people, 12 open tasks, 7 completed in the last week.
    expect(await within(metrics).findByLabelText('Active events: 2')).toBeInTheDocument()
    expect(within(metrics).getByLabelText('Volunteers: 15')).toBeInTheDocument()
    expect(within(metrics).getByLabelText('Pending tasks: 12')).toBeInTheDocument()
    expect(within(metrics).getByLabelText('Completed: 7')).toBeInTheDocument()
    expect(screen.getByText(/Demo workspace\./)).toBeInTheDocument()
  })

  it('opens and closes the mobile navigation drawer', async () => {
    const { user } = await renderRoute('/app')
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    await user.click(within(drawer).getByRole('link', { name: 'Tasks' }))
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'To do column' })).toBeInTheDocument()
  })

  it('quick search navigates to a matching page', async () => {
    const { user, router } = await renderRoute('/app')
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'volun{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/volunteers'))
  })

  it('quick search finds events and people', async () => {
    const { user, router } = await renderRoute('/app')
    const box = screen.getByRole('combobox', { name: 'Search' })
    await user.type(box, 'techfest')
    await user.click(await screen.findByRole('button', { name: /TechFest 2026/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/events/evttechfest'))
  })

  it('shows Analytics as planned for Milestone 5', async () => {
    await renderRoute('/app/analytics')
    expect(await screen.findByText('Planned · Milestone 5')).toBeInTheDocument()
  })

  it('shows an empty notifications panel', async () => {
    const { user } = await renderRoute('/app')
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })
})

describe('navItemFor', () => {
  it('resolves nested routes by longest prefix', () => {
    expect(navItemFor('/app/events/new')?.label).toBe('My Events')
    expect(navItemFor('/app')?.label).toBe('Overview')
    expect(navItemFor('/elsewhere')).toBeUndefined()
  })
})
