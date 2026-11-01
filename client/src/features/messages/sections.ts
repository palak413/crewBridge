import { keyOf, type ChannelRef, type ChatSession } from '../../lib/chat/types'
import type { Person } from '../../lib/data/types'

export interface ListItem {
  key: string
  ref: ChannelRef
  name: string
  hint: string
  person?: Person
}

/** Build the sidebar sections from the session's authorized channels and DM contacts. */
export function buildSections(session: ChatSession, people: Person[]) {
  const byId = new Map(people.map((p) => [p.id, p]))
  const events: ListItem[] = []
  const departments: ListItem[] = []
  for (const c of session.channels) {
    const item = { key: keyOf(c.ref), ref: c.ref, name: c.name, hint: c.kind === 'event' ? 'Everyone on this event' : c.eventTitle }
    ;(c.kind === 'event' ? events : departments).push(item)
  }
  const direct: ListItem[] = session.contacts
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ key: keyOf({ type: 'direct', id: p.id }), ref: { type: 'direct', id: p.id }, name: p.name, hint: p.email, person: p }))
  return { events, departments, direct }
}
