const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const dateYearFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatDate(iso: string, now = new Date()) {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() ? dateFmt.format(d) : dateYearFmt.format(d)
}

export function formatDateTime(iso: string) {
  return fullFmt.format(new Date(iso))
}

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso))
}

export function formatRange(startIso: string, endIso: string, now = new Date()) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const sameDay = s.toDateString() === e.toDateString()
  if (sameDay) return `${formatDate(startIso, now)}, ${formatTime(startIso)} – ${formatTime(endIso)}`
  return `${formatDate(startIso, now)} – ${formatDate(endIso, now)}`
}

/** "5m ago", "3h ago", "2d ago", or a date beyond a week. */
export function timeAgo(iso: string, now = new Date()) {
  const diff = now.getTime() - Date.parse(iso)
  if (diff < MIN) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`
  return formatDate(iso, now)
}

export type DueState = 'overdue' | 'soon' | 'later'

/** Short due label plus urgency: overdue, due within 3 hours, or later. */
export function dueInfo(iso: string, now = new Date()): { label: string; state: DueState } {
  const diff = Date.parse(iso) - now.getTime()
  const abs = Math.abs(diff)
  const span = abs < HOUR ? `${Math.max(1, Math.round(abs / MIN))}m` : abs < DAY ? `${Math.round(abs / HOUR)}h` : `${Math.round(abs / DAY)}d`
  if (diff < 0) return { label: `Overdue ${span}`, state: 'overdue' }
  if (diff < 3 * HOUR) return { label: `Due in ${span}`, state: 'soon' }
  if (diff < DAY) return { label: `Due ${formatTime(iso)}`, state: 'later' }
  return { label: `Due ${formatDate(iso, now)}`, state: 'later' }
}

/** ISO → value for <input type="datetime-local"> in the user's local time zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value → ISO, or null when empty/invalid. */
export function fromLocalInput(value: string) {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
