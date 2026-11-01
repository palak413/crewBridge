import type { Task } from '../../lib/data/types'

export const DAYS = 14

export interface DayBucket {
  date: Date
  created: number
  completed: number
}

export function bucketByDay(tasks: Task[], now = new Date(), days = DAYS): DayBucket[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const buckets: DayBucket[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: d, created: 0, completed: 0 }
  })
  const index = (iso: string) => {
    const d = new Date(iso)
    d.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - start.getTime()) / 86_400_000)
  }
  for (const t of tasks) {
    const c = index(t.createdAt)
    if (c >= 0 && c < days) buckets[c].created++
    if (t.completedAt) {
      const k = index(t.completedAt)
      if (k >= 0 && k < days) buckets[k].completed++
    }
  }
  return buckets
}
