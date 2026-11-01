import type { Activity, Availability, CrewEvent, Department, Person, Role, Task, TaskPriority, TaskStatus } from './types'

/**
 * Demo workspace seed. Every record is flagged `isDemo` and the UI labels the workspace as a demo.
 * Dates are relative to "now" so deadlines, live status and the 14-day chart stay meaningful.
 */

export interface Workspace {
  version: 1
  currentUserId: string
  people: Person[]
  events: CrewEvent[]
  departments: Department[]
  tasks: Task[]
  activity: Activity[]
}

const H = 3_600_000
const D = 24 * H

export function createSeed(now = new Date()): Workspace {
  const t = now.getTime()
  const iso = (offset: number) => new Date(t + offset).toISOString()
  // Snap "today at hh:mm" offsets to whole minutes for tidier display.
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(t + dayOffset * D)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  const person = (id: string, name: string, role: Role, skills: string[], availability: Availability, phone: string | null = null): Person => ({
    id,
    name,
    email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@example.org`,
    phone,
    role,
    skills,
    availability,
    availabilityUpdatedAt: iso(-2 * H),
    createdAt: iso(-30 * D),
    isDemo: true,
  })

  const people: Person[] = [
    person('usrpriya', 'Priya Sharma', 'organizer', ['operations', 'public speaking'], 'available', '+91 98450 11223'),
    person('usrarjun', 'Arjun Mehta', 'leader', ['check-in', 'crowd management'], 'available', '+91 98450 22334'),
    person('usrsara', 'Sara Okafor', 'leader', ['hospitality', 'catering'], 'busy'),
    person('usrdev', 'Dev Patel', 'leader', ['av', 'networking', 'check-in'], 'available', '+91 98450 33445'),
    person('usrlena', 'Lena Fischer', 'leader', ['logistics', 'driving'], 'available'),
    person('usrana', 'Ana Ruiz', 'volunteer', ['check-in', 'languages'], 'available'),
    person('usrmeera', 'Meera Iyer', 'volunteer', ['check-in', 'social media'], 'available'),
    person('usrleo', 'Leo Grant', 'volunteer', ['hospitality', 'first aid'], 'busy'),
    person('usrsam', 'Sam Chen', 'volunteer', ['setup', 'logistics'], 'unavailable'),
    person('usrkabir', 'Kabir Rao', 'volunteer', ['av', 'photography'], 'available'),
    person('usrzoe', 'Zoe Martin', 'volunteer', ['first aid', 'crowd management'], 'available'),
    person('usrishaan', 'Ishaan Verma', 'volunteer', ['networking', 'av'], 'busy'),
    person('usrnora', 'Nora Haddad', 'volunteer', ['hospitality', 'languages'], 'available'),
    person('usromar', 'Omar Siddiqui', 'volunteer', ['driving', 'setup'], 'available'),
    person('usrtara', 'Tara Nguyen', 'volunteer', ['social media', 'photography'], 'unavailable'),
    person('usrrohan', 'Rohan Das', 'volunteer', ['setup', 'crowd management'], 'available'),
  ]

  const event = (e: Omit<CrewEvent, 'organizerId' | 'createdAt' | 'updatedAt' | 'isDemo' | 'coverUrl'>): CrewEvent => ({
    ...e,
    coverUrl: null,
    organizerId: 'usrpriya',
    createdAt: iso(-21 * D),
    updatedAt: iso(-1 * D),
    isDemo: true,
  })

  const events: CrewEvent[] = [
    event({
      id: 'evttechfest',
      title: 'TechFest 2026',
      description:
        'Three-day inter-college technical festival with talks, workshops, a robotics arena and a 24-hour hackathon. Expect around 4,000 visitors across the main campus.',
      startAt: at(-1, 9),
      endAt: at(1, 20),
      location: 'Main campus, Block A',
      coverTheme: 'forest',
      status: 'live',
      memberIds: people.map((p) => p.id).filter((id) => id !== 'usrpriya' && id !== 'usrtara'),
    }),
    event({
      id: 'evthack',
      title: 'Campus Hackathon',
      description: 'A 36-hour student hackathon with mentors from local startups. Teams of up to four, judged on impact and execution.',
      startAt: at(14, 10),
      endAt: at(15, 22),
      location: 'Innovation Lab, Block C',
      coverTheme: 'slate',
      status: 'upcoming',
      memberIds: ['usrdev', 'usrkabir', 'usrishaan', 'usrmeera', 'usrtara', 'usrrohan'],
    }),
    event({
      id: 'evtalumni',
      title: 'Alumni Meetup',
      description: 'Evening reunion and networking session for the graduating classes of the last five years.',
      startAt: at(-12, 17),
      endAt: at(-12, 21),
      location: 'Convocation Hall',
      coverTheme: 'sand',
      status: 'completed',
      memberIds: ['usrsara', 'usrnora', 'usrleo', 'usrlena'],
    }),
  ]

  const dept = (id: string, eventId: string, name: string, description: string, leaderId: string | null, memberIds: string[]): Department => ({
    id,
    eventId,
    name,
    description,
    leaderId,
    memberIds,
    createdAt: iso(-20 * D),
  })

  const departments: Department[] = [
    dept('depreg', 'evttechfest', 'Registration', 'Check-in desks, badges and visitor queries.', 'usrarjun', ['usrarjun', 'usrana', 'usrmeera', 'usrzoe']),
    dept('dephosp', 'evttechfest', 'Hospitality', 'Speaker care, green room and refreshments.', 'usrsara', ['usrsara', 'usrleo', 'usrnora']),
    dept('deptech', 'evttechfest', 'Tech support', 'AV, Wi-Fi and stage equipment for every venue.', 'usrdev', ['usrdev', 'usrkabir', 'usrishaan']),
    dept('deplog', 'evttechfest', 'Logistics', 'Setup, transport and inventory across venues.', 'usrlena', ['usrlena', 'usrsam', 'usromar', 'usrrohan']),
    dept('depmentor', 'evthack', 'Mentors', 'Mentor scheduling and team support.', 'usrdev', ['usrdev', 'usrishaan']),
    dept('depops', 'evthack', 'Operations', 'Venue, food and overnight logistics.', null, ['usrrohan', 'usrmeera']),
    dept('depwelcome', 'evtalumni', 'Welcome', 'Guest welcome and seating.', 'usrsara', ['usrsara', 'usrnora', 'usrleo']),
  ]

  let n = 0
  const task = (
    eventId: string,
    departmentId: string | null,
    title: string,
    description: string,
    priority: TaskPriority,
    status: TaskStatus,
    assigneeId: string | null,
    dueAt: string | null,
    completedAgo?: number,
  ): Task => {
    n += 1
    // Spread creation over the past days so the 14-day chart reflects a realistic planning rhythm.
    const createdAt = iso(-(completedAgo !== undefined ? completedAgo + ((n % 3) + 1) * D : ((n % 6) + 1) * D - 2 * H) + n * 60_000)
    return {
      id: `tsk${String(n).padStart(3, '0')}`,
      eventId,
      departmentId,
      title,
      description,
      priority,
      status,
      assigneeId,
      dueAt,
      createdBy: 'usrpriya',
      createdAt,
      updatedAt: completedAgo !== undefined ? iso(-completedAgo) : createdAt,
      completedAt: status === 'completed' ? iso(-(completedAgo ?? D)) : null,
      isDemo: true,
    }
  }

  const tasks: Task[] = [
    task('evttechfest', 'depreg', 'Cover registration desk B', 'Desk B volunteer called in sick. Needs someone familiar with the check-in app.', 'urgent', 'todo', null, iso(1 * H)),
    task('evttechfest', 'depreg', 'Print badge reprints', 'Reprint the 40 badges flagged with misspelled names at the help desk.', 'high', 'todo', 'usrmeera', iso(3 * H)),
    task('evttechfest', 'depreg', 'Restock lanyards at Gate 2', '', 'medium', 'in_progress', 'usrana', iso(2 * H)),
    task('evttechfest', 'dephosp', 'Stock water at Hall C', 'Two crates for the afternoon keynote audience.', 'medium', 'todo', 'usrleo', iso(5 * H)),
    task('evttechfest', 'dephosp', 'Escort keynote speaker to green room', 'Arrives at the north gate. Carry the speaker pass.', 'high', 'in_progress', 'usrnora', iso(4 * H)),
    task('evttechfest', 'deptech', 'Projector check, Room 2', 'Projector flickers on HDMI. Try the spare adapter first.', 'high', 'in_progress', 'usrkabir', iso(90 * 60_000)),
    task('evttechfest', 'deptech', 'Wi-Fi coverage test in the arena', 'Walk the arena with the speed test app and log dead zones.', 'medium', 'todo', null, iso(20 * H)),
    task('evttechfest', 'deplog', 'Move 30 chairs to Seminar Hall', '', 'low', 'todo', 'usromar', iso(26 * H)),
    task('evttechfest', 'deplog', 'Collect signage after day one', 'All A-frame signs back to store room 4.', 'low', 'todo', null, iso(30 * H)),
    task('evttechfest', 'deplog', 'Robotics arena barrier setup', '', 'high', 'completed', 'usrrohan', iso(-20 * H), 22 * H),
    task('evttechfest', 'depreg', 'Open check-in desks', '', 'urgent', 'completed', 'usrarjun', iso(-26 * H), 26 * H),
    task('evttechfest', 'dephosp', 'Speaker green room setup', '', 'medium', 'completed', 'usrsara', iso(-28 * H), 30 * H),
    task('evttechfest', 'deptech', 'Sound check, main stage', '', 'high', 'completed', 'usrdev', iso(-2 * D), 2 * D + 3 * H),
    task('evttechfest', 'deptech', 'Label all spare cables', '', 'low', 'completed', 'usrishaan', iso(-3 * D), 3 * D),
    task('evttechfest', 'deplog', 'Confirm transport for guest teams', '', 'medium', 'completed', 'usrlena', iso(-4 * D), 5 * D),
    task('evttechfest', 'depreg', 'Train volunteers on check-in app', '', 'high', 'completed', 'usrarjun', iso(-6 * D), 6 * D),
    task('evthack', 'depmentor', 'Confirm mentor schedule', 'Each mentor gets two 3-hour slots.', 'high', 'todo', 'usrdev', iso(5 * D)),
    task('evthack', 'depops', 'Book overnight security', '', 'medium', 'todo', null, iso(9 * D)),
    task('evthack', null, 'Publish judging criteria', '', 'medium', 'in_progress', 'usrishaan', iso(7 * D)),
    task('evtalumni', 'depwelcome', 'Prepare name cards', '', 'low', 'completed', 'usrnora', at(-12, 15), 12 * D + 3 * H),
    task('evtalumni', 'depwelcome', 'Guest seating plan', '', 'medium', 'completed', 'usrsara', at(-13, 12), 13 * D),
  ]

  const act = (agoMs: number, actorId: string, verb: Activity['verb'], target: string, detail: string | null, eventId = 'evttechfest'): Activity => ({
    id: `act${Math.round(agoMs / 1000)}${actorId}`,
    at: iso(-agoMs),
    actorId,
    verb,
    eventId,
    target,
    detail,
  })

  const activity: Activity[] = [
    act(4 * 60_000, 'usrpriya', 'created_task', 'Cover registration desk B', 'Registration'),
    act(25 * 60_000, 'usrkabir', 'moved_task', 'Projector check, Room 2', 'In progress'),
    act(50 * 60_000, 'usrpriya', 'assigned_task', 'Escort keynote speaker to green room', 'Nora Haddad'),
    act(70 * 60_000, 'usrana', 'moved_task', 'Restock lanyards at Gate 2', 'In progress'),
    act(22 * H, 'usrrohan', 'completed_task', 'Robotics arena barrier setup', null),
    act(26 * H, 'usrarjun', 'completed_task', 'Open check-in desks', null),
    act(2 * D, 'usrpriya', 'added_volunteer', 'Rohan Das', 'TechFest 2026'),
    act(3 * D, 'usrpriya', 'created_event', 'Campus Hackathon', null, 'evthack'),
  ]

  return { version: 1, currentUserId: 'usrpriya', people, events, departments, tasks, activity }
}
