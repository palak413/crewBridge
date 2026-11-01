import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import type { Task } from '../../lib/data/types'
import { bucketByDay, DAYS } from './chartData'

/**
 * Tasks created vs. completed per day, last 14 days.
 * Palette validated with the dataviz validator (light surface): CVD ΔE 10.1, normal ΔE 20.7.
 * "Created" is below 3:1 contrast, so identity never relies on color alone: legend, per-day
 * tooltip and a table view are provided.
 */
const SERIES = [
  { key: 'created', label: 'Created', color: '#C08A2E' },
  { key: 'completed', label: 'Completed', color: '#16825A' },
] as const

const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export function CompletionChart({ tasks }: { tasks: Task[] }) {
  const [now] = useState(() => new Date())
  const data = useMemo(() => bucketByDay(tasks, now), [tasks, now])
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...data.map((d) => Math.max(d.created, d.completed)))
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 2) * 2
  const totals = { created: data.reduce((s, d) => s + d.created, 0), completed: data.reduce((s, d) => s + d.completed, 0) }

  return (
    <div className="px-4 pb-4 pt-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex items-center gap-4 text-xs text-muted-strong" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label} <span className="tabular-nums text-ink">{totals[s.key]}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-medium text-primary hover:underline" aria-pressed={asTable}>
          {asTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {asTable ? (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-[10px] border border-line">
          <table className="w-full text-[13px]">
            <caption className="sr-only">Tasks created and completed per day, last 14 days</caption>
            <thead className="sticky top-0 bg-canvas text-xs text-muted-strong">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Day
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Created
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...data].reverse().map((d) => (
                <tr key={d.date.toISOString()}>
                  <td className="px-3 py-1.5 text-ink-soft">{weekdayFmt.format(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.created}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3" role="img" aria-label={`Last 14 days: ${totals.created} tasks created, ${totals.completed} completed.`}>
          <div className="flex h-40 gap-2">
            {/* y-axis */}
            <div aria-hidden className="flex w-4 flex-col justify-between text-right text-2xs tabular-nums text-muted">
              <span>{niceMax}</span>
              <span>{niceMax / 2}</span>
              <span>0</span>
            </div>
            <div className="relative flex-1">
              <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
                <div className="border-t border-line/70" />
                <div className="border-t border-line/70" />
                <div className="border-t border-line-strong" />
              </div>
              <div className="relative flex h-full items-end" onMouseLeave={() => setHover(null)}>
                {data.map((d, i) => (
                  <div
                    key={d.date.toISOString()}
                    onMouseEnter={() => setHover(i)}
                    className={cn('flex h-full flex-1 items-end justify-center gap-[2px] rounded-sm', hover === i && 'bg-subtle')}
                  >
                    {SERIES.map((s) => {
                      const v = d[s.key]
                      return (
                        <div
                          key={s.key}
                          className="w-[min(10px,32%)] rounded-t-[4px]"
                          style={{ height: v ? `${(v / niceMax) * 100}%` : 0, background: s.color, minHeight: v ? 3 : 0 }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              {hover !== null && (
                <div
                  className="pointer-events-none absolute -top-2 z-10 w-36 -translate-y-full rounded-[10px] border border-line bg-surface px-3 py-2 text-xs shadow-pop"
                  style={{ left: `clamp(0px, calc(${((hover + 0.5) / DAYS) * 100}% - 72px), calc(100% - 144px))` }}
                >
                  <p className="font-medium text-ink">{weekdayFmt.format(data[hover].date)}</p>
                  {SERIES.map((s) => (
                    <p key={s.key} className="mt-1 flex items-center justify-between text-muted-strong">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="tabular-nums text-ink">{data[hover][s.key]}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div aria-hidden className="ml-6 mt-1.5 flex justify-between text-2xs text-muted">
            <span>{dayFmt.format(data[0].date)}</span>
            <span>{dayFmt.format(data[7].date)}</span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}
