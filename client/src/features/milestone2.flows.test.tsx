import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('Events', () => {
  it('lists events and filters by status', async () => {
    const { user } = await renderRoute('/app/events')
    expect(await screen.findByRole('heading', { name: 'TechFest 2026' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Upcoming/ }))
    expect(screen.getByRole('heading', { name: 'Campus Hackathon' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'TechFest 2026' })).toBeNull()
  })

  it('validates and creates an event, then opens its workspace', async () => {
    const { user, router } = await renderRoute('/app/events/new')
    await user.click(await screen.findByRole('button', { name: 'Create event' }))
    expect(await screen.findByText('Use at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Enter a location')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Event name'), 'Spring Marathon')
    await user.type(screen.getByLabelText('Location'), 'City park')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/app\/events\/evt/))
    expect(await screen.findByRole('heading', { name: 'Spring Marathon' })).toBeInTheDocument()
    expect(screen.getByText('Event created')).toBeInTheDocument()
  })

  it('adds a department from the event workspace', async () => {
    const { user } = await renderRoute('/app/events/evthack?tab=departments')
    await user.click(await screen.findByRole('button', { name: 'Add department' }))
    const dialog = screen.getByRole('dialog', { name: 'Add department' })
    await user.type(within(dialog).getByLabelText('Name'), 'Judging')
    await user.selectOptions(within(dialog).getByLabelText('Team leader'), 'Kabir Rao')
    await user.click(within(dialog).getByRole('button', { name: 'Add department' }))
    expect(await screen.findByRole('heading', { name: 'Judging' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('edits an event', async () => {
    const { user, router } = await renderRoute('/app/events/evthack/edit')
    const title = await screen.findByLabelText('Event name')
    await user.clear(title)
    await user.type(title, 'Campus Hackathon 2026')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/events/evthack'))
    expect(await screen.findByRole('heading', { name: 'Campus Hackathon 2026' })).toBeInTheDocument()
  })

  it('shows a not-found state for unknown events', async () => {
    await renderRoute('/app/events/evtmissing')
    expect(await screen.findByText('Event not found')).toBeInTheDocument()
  })
})

describe('Task board', () => {
  it('creates an assigned task and shows it in To do', async () => {
    const { user } = await renderRoute('/app/tasks?event=evttechfest')
    await user.click(await screen.findByRole('button', { name: 'New task' }))
    const dialog = screen.getByRole('dialog', { name: 'New task' })
    await user.type(within(dialog).getByLabelText('Title'), 'Set up photo booth')
    await user.selectOptions(within(dialog).getByLabelText('Department'), 'Logistics')
    await user.selectOptions(within(dialog).getByLabelText('Assignee'), within(dialog).getByRole('option', { name: /Omar Siddiqui/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }))

    const todo = await screen.findByRole('region', { name: 'To do column' })
    expect(await within(todo).findByRole('button', { name: 'Set up photo booth' })).toBeInTheDocument()
  })

  it('moves a task with the keyboard-accessible card menu', async () => {
    const { user } = await renderRoute('/app/tasks?event=evttechfest')
    const todo = await screen.findByRole('region', { name: 'To do column' })
    await user.click(within(todo).getByRole('button', { name: 'Actions for Stock water at Hall C' }))
    await user.click(screen.getByRole('menuitem', { name: 'Mark complete' }))
    const done = screen.getByRole('region', { name: 'Completed column' })
    expect(await within(done).findByRole('button', { name: 'Stock water at Hall C' })).toBeInTheDocument()
  })

  it('available view shows only unassigned open tasks', async () => {
    const { user } = await renderRoute('/app/tasks')
    await user.click(await screen.findByRole('tab', { name: /Available/ }))
    const todo = screen.getByRole('region', { name: 'To do column' })
    expect(within(todo).getByRole('button', { name: 'Cover registration desk B' })).toBeInTheDocument()
    expect(within(todo).queryByRole('button', { name: 'Print badge reprints' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Completed column' })).toBeNull()
  })

  it('blocks assigning someone outside the event', async () => {
    const { user } = await renderRoute('/app/tasks?event=evttechfest')
    await user.click(await screen.findByRole('button', { name: 'New task' }))
    const dialog = screen.getByRole('dialog', { name: 'New task' })
    // Only TechFest members are offered — Tara Nguyen is not one.
    expect(within(dialog).queryByRole('option', { name: /Tara Nguyen/ })).toBeNull()
  })
})

describe('Volunteer directory', () => {
  it('filters by availability and skill', async () => {
    const { user } = await renderRoute('/app/volunteers')
    expect(await screen.findByRole('button', { name: 'Ana Ruiz' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Filter by availability'), 'unavailable')
    expect(screen.queryByRole('button', { name: 'Ana Ruiz' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Sam Chen' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Filter by skill'), 'photography')
    expect(screen.getByRole('button', { name: 'Tara Nguyen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sam Chen' })).toBeNull()
  })

  it('adds a volunteer and opens their profile', async () => {
    const { user } = await renderRoute('/app/volunteers')
    await user.click(await screen.findByRole('button', { name: 'Add volunteer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add volunteer' })
    await user.type(within(dialog).getByLabelText('Full name'), 'Maya Lin')
    await user.type(within(dialog).getByLabelText('Email'), 'maya@example.org')
    await user.type(within(dialog).getByLabelText('Skills'), 'first aid, Driving')
    await user.click(within(dialog).getByRole('button', { name: 'Add volunteer' }))
    const profile = await screen.findByRole('dialog', { name: 'Maya Lin' })
    expect(within(profile).getByText('driving')).toBeInTheDocument()
  })

  it('rejects a duplicate email with a field error', async () => {
    const { user } = await renderRoute('/app/volunteers')
    await user.click(await screen.findByRole('button', { name: 'Add volunteer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add volunteer' })
    await user.type(within(dialog).getByLabelText('Full name'), 'Ana Again')
    await user.type(within(dialog).getByLabelText('Email'), 'ana.ruiz@example.org')
    await user.click(within(dialog).getByRole('button', { name: 'Add volunteer' }))
    expect(await within(dialog).findByText('Already in your directory')).toBeInTheDocument()
  })

  it('updates availability from the profile', async () => {
    const { user } = await renderRoute('/app/volunteers?person=usrana')
    const profile = await screen.findByRole('dialog', { name: 'Ana Ruiz' })
    await user.click(within(profile).getByRole('radio', { name: 'Busy' }))
    await waitFor(() => expect(within(profile).getByRole('radio', { name: 'Busy' })).toHaveAttribute('aria-checked', 'true'))
  })
})
