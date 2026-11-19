
import { Router } from 'express'
import { visibleEventIds, visiblePeopleIds } from '../auth/access'
import { me } from '../auth/session'
import { Activity, Department, Event, Task, User } from '../models'

const eventStatuses = ['draft', 'upcoming', 'live', 'completed'] as const
const taskStatuses = ['todo', 'in_progress', 'completed'] as const
const availabilities = ['available', 'busy', 'unavailable'] as const
const roles = ['organizer', 'leader', 'volunteer'] as const

export function analyticsRoutes() {
  const r = Router()

  r.get('/overview', async (req, res) => {
    const u = me(req)

    // Only retrieve records the current user is authorized to see.
    const [eventIds, personIds] = await Promise.all([
      visibleEventIds(u),
      visiblePeopleIds(u),
    ])

    const [
      events,
      tasks,
      people,
      departments,
      recentActivity,
    ] = await Promise.all([
      Event.find({ _id: { $in: eventIds } }).select('status').lean(),

      Task.find({ eventId: { $in: eventIds } })
        .select('status eventId departmentId assigneeId dueAt completedAt')
        .lean(),

      User.find({ _id: { $in: personIds } })
        .select('role availability')
        .lean(),

      Department.find({ eventId: { $in: eventIds } })
        .select('name eventId memberIds')
        .lean(),

      Activity.find({
        $or: [
          { eventId: { $in: eventIds } },
          { eventId: null, actorId: u._id },
        ],
      })
        .sort({ at: -1, _id: -1 })
        .limit(8),
    ])

    const eventCounts = Object.fromEntries(
      eventStatuses.map((status) => [
        status,
        events.filter((event) => event.status === status).length,
      ]),
    )

    const taskCounts = Object.fromEntries(
      taskStatuses.map((status) => [
        status,
        tasks.filter((task) => task.status === status).length,
      ]),
    )

    const availabilityCounts = Object.fromEntries(
      availabilities.map((availability) => [
        availability,
        people.filter((person) => person.availability === availability).length,
      ]),
    )

    const roleCounts = Object.fromEntries(
      roles.map((role) => [
        role,
        people.filter((person) => person.role === role).length,
      ]),
    )

    const completedTasks = taskCounts.completed
    const totalTasks = tasks.length

    const completionRate = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    const departmentStats = departments.map((department) => ({
      id: String(department._id),
      name: department.name,
      eventId: String(department.eventId),
      volunteerCount: department.memberIds.length,
      taskCount: tasks.filter(
        (task) => String(task.departmentId) === String(department._id),
      ).length,
      completedTasks: tasks.filter(
        (task) =>
          String(task.departmentId) === String(department._id) &&
          task.status === 'completed',
      ).length,
    }))

    res.json({
      overview: {
        totalEvents: events.length,
        totalVolunteers: people.length,
        totalTasks,
        completedTasks,
        completionRate,
      },
      events: eventCounts,
      tasks: taskCounts,
      volunteers: {
        total: people.length,
        availability: availabilityCounts,
        roles: roleCounts,
      },
      departments: departmentStats,
      recentActivity: recentActivity.map((activity) => activity.toJSON()),
    })
  })

  return r
}
