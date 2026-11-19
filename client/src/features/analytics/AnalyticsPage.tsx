import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Users,
  TrendingUp,
  Activity as ActivityIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Panel } from '../../components/ui/Panel'
import { useAnalytics } from '../../lib/data/queries'
import { timeAgo } from '../../lib/format'
import type { Activity } from '../../lib/data/types'

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number | string
  icon: typeof Users
  hint: string
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-strong">{label}</span>
        <Icon className="size-5 text-primary" aria-hidden />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="py-3">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="tabular-nums text-muted-strong">
          {value} ({percentage}%)
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function activityLabel(activity: Activity) {
  const labels: Record<Activity['verb'], string> = {
    created_event: 'Created an event',
    updated_event: 'Updated an event',
    created_department: 'Created a department',
    added_volunteer: 'Added a volunteer',
    created_task: 'Created a task',
    assigned_task: 'Assigned a task',
    moved_task: 'Moved a task',
    completed_task: 'Completed a task',
  }

  return labels[activity.verb]
}

export function AnalyticsPage() {
  const { data, isPending, isError, error } = useAnalytics()

  if (isPending) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded bg-subtle" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-card border border-line bg-surface"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-semibold text-ink">Unable to load analytics</h2>
        <p className="mt-2 text-sm text-muted-strong">
          {error instanceof Error ? error.message : 'Please try again later.'}
        </p>
      </div>
    )
  }

  const { overview, events, tasks, volunteers, departments, recentActivity } = data

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-strong">
          Understand your events, volunteers and team performance.
        </p>
      </div>

      {/* Overview metrics */}
      <section
        aria-label="Analytics overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <MetricCard
          label="Total events"
          value={overview.totalEvents}
          icon={CalendarDays}
          hint="Across your workspace"
        />
        <MetricCard
          label="Volunteers"
          value={overview.totalVolunteers}
          icon={Users}
          hint="Registered volunteers"
        />
        <MetricCard
          label="Total tasks"
          value={overview.totalTasks}
          icon={ClipboardList}
          hint="All assigned work"
        />
        <MetricCard
          label="Completion rate"
          value={`${overview.completionRate}%`}
          icon={TrendingUp}
          hint={`${overview.completedTasks} tasks completed`}
        />
      </section>

      {/* Event and task analytics */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Event breakdown" description="Events by current status">
          <div className="px-5 pb-4">
            <ProgressRow label="Draft" value={events.draft} total={overview.totalEvents} />
            <ProgressRow label="Upcoming" value={events.upcoming} total={overview.totalEvents} />
            <ProgressRow label="Live" value={events.live} total={overview.totalEvents} />
            <ProgressRow label="Completed" value={events.completed} total={overview.totalEvents} />
          </div>
        </Panel>

        <Panel title="Task progress" description="Distribution of tasks by status">
          <div className="px-5 pb-4">
            <ProgressRow label="To do" value={tasks.todo} total={overview.totalTasks} />
            <ProgressRow label="In progress" value={tasks.in_progress} total={overview.totalTasks} />
            <ProgressRow label="Completed" value={tasks.completed} total={overview.totalTasks} />
            <div className="mt-4 rounded-xl bg-sage p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="size-4" />
                Overall completion
              </div>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {overview.completionRate}%
              </p>
            </div>
          </div>
        </Panel>
      </section>

      {/* Volunteer analytics */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Volunteer availability" description="Current availability of volunteers">
          <div className="px-5 pb-4">
            <ProgressRow
              label="Available"
              value={volunteers.availability.available}
              total={volunteers.total}
            />
            <ProgressRow
              label="Busy"
              value={volunteers.availability.busy}
              total={volunteers.total}
            />
            <ProgressRow
              label="Unavailable"
              value={volunteers.availability.unavailable}
              total={volunteers.total}
            />
          </div>
        </Panel>

        <Panel title="Team distribution" description="People by workspace role">
          <div className="divide-y divide-line px-5">
            {Object.entries(volunteers.roles).map(([role, count]) => (
              <div key={role} className="flex justify-between py-4">
                <span className="text-sm capitalize text-ink-soft">
                  {role}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Department performance */}
      <Panel
        title="Department performance"
        description="Volunteer participation and task completion by department"
      >
        {departments.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-strong">
            No departments have been created yet.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {departments.map((department) => (
              <div
                key={department.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{department.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {department.volunteerCount} volunteers · {department.taskCount} tasks
                  </p>
                </div>
                <div className="sm:w-48">
                  <ProgressRow
                    label="Tasks completed"
                    value={department.completedTasks}
                    total={department.taskCount}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Recent activity */}
      <Panel
        title="Recent activity"
        description="Latest changes across your workspace"
        actions={
          <Link
            to="/app"
            className="text-sm font-medium text-primary hover:underline"
          >
            Dashboard
          </Link>
        }
      >
        {recentActivity.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-strong">
            No recent activity available.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-3 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage">
                  <ActivityIcon className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {activityLabel(activity)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-strong">
                    {activity.target}
                    {activity.detail ? ` · ${activity.detail}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {timeAgo(activity.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
