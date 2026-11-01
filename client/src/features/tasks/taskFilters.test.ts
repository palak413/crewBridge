import { describe, expect, it } from 'vitest'
import { bucketByDay } from '../dashboard/chartData'
import { dueInfo } from '../../lib/format'
import type { Task } from '../../lib/data/types'
import { applyFilters, sortForBoard } from './taskFilters'

const base: Task = {
  id: 't',
  eventId: 'e1',
  departmentId: 'd1',
  title: 'Task',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigneeId: null,
  dueAt: null,
  createdBy: 'me',
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  completedAt: null,
  isDemo: false,
}
const t = (over: Partial<Task>): Task => ({ ...base, ...over })

describe('task views and filters', () => {
  const tasks = [
    t({ id: 'a', assigneeId: null, createdBy: 'other' }),
    t({ id: 'b', assigneeId: 'me', createdBy: 'other' }),
    t({ id: 'c', status: 'completed', assigneeId: 'x', createdBy: 'other' }),
    t({ id: 'd', eventId: 'e2', departmentId: null, createdBy: 'me', priority: 'urgent', title: 'Fix stage lights' }),
  ]
  const f = { view: 'all' as const, eventId: '', departmentId: '', priority: '' as const, query: '' }
  const ids = (list: Task[]) => list.map((x) => x.id)

  it('available = unassigned and not completed', () => {
    expect(ids(applyFilters(tasks, { ...f, view: 'available' }, 'me'))).toEqual(['a', 'd'])
  })
  it('mine = assigned to or created by me', () => {
    expect(ids(applyFilters(tasks, { ...f, view: 'mine' }, 'me'))).toEqual(['b', 'd'])
  })
  it('completed view', () => {
    expect(ids(applyFilters(tasks, { ...f, view: 'completed' }, 'me'))).toEqual(['c'])
  })
  it('combines event, priority and search filters', () => {
    expect(ids(applyFilters(tasks, { ...f, eventId: 'e2', priority: 'urgent', query: 'stage' }, 'me'))).toEqual(['d'])
    expect(ids(applyFilters(tasks, { ...f, query: 'nothing' }, 'me'))).toEqual([])
  })
  it('sorts urgent first, then earliest due', () => {
    const sorted = [
      t({ id: 'late', dueAt: '2026-11-02T00:00:00Z' }),
      t({ id: 'urgent', priority: 'urgent' }),
      t({ id: 'soon', dueAt: '2026-11-01T00:00:00Z' }),
    ].sort(sortForBoard)
    expect(ids(sorted)).toEqual(['urgent', 'soon', 'late'])
  })
})

describe('bucketByDay', () => {
  it('counts created and completed per local day for 14 days', () => {
    const now = new Date(2026, 9, 31, 12)
    const day = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString()
    const buckets = bucketByDay(
      [
        t({ createdAt: day(31), completedAt: day(31, 11) }),
        t({ createdAt: day(30) }),
        t({ createdAt: day(1), completedAt: day(18) }), // created outside the window
      ],
      now,
    )
    expect(buckets).toHaveLength(14)
    expect(buckets[13]).toMatchObject({ created: 1, completed: 1 })
    expect(buckets[12]).toMatchObject({ created: 1, completed: 0 })
    expect(buckets[0]).toMatchObject({ created: 0, completed: 1 }) // Oct 18 is the first day
  })
})

describe('dueInfo', () => {
  const now = new Date('2026-10-31T10:00:00Z')
  it('flags overdue and soon', () => {
    expect(dueInfo('2026-10-31T09:00:00Z', now)).toEqual({ label: 'Overdue 1h', state: 'overdue' })
    expect(dueInfo('2026-10-31T10:30:00Z', now)).toEqual({ label: 'Due in 30m', state: 'soon' })
    expect(dueInfo('2026-11-03T10:00:00Z', now).state).toBe('later')
  })
})
