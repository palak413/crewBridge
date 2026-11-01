import { ArrowRight, CircleCheck, Clock, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Menu, type MenuItem } from '../../components/ui/Menu'
import { cn } from '../../lib/cn'
import { priorityMeta, taskStatusMeta } from '../../lib/data/labels'
import { taskStatuses } from '../../lib/data/schemas'
import type { Person, Task, TaskStatus } from '../../lib/data/types'
import { dueInfo } from '../../lib/format'

export function TaskCard({
  task,
  assignee,
  context,
  onOpen,
  onMove,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  canEdit = true,
  canMove = true,
}: {
  task: Task
  assignee: Person | undefined
  /** e.g. "TechFest 2026 · Registration" */
  context: string
  onOpen: () => void
  onMove: (status: TaskStatus) => void
  onDelete: () => void
  dragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  canEdit?: boolean
  canMove?: boolean
}) {
  const pr = priorityMeta[task.priority]
  const due = task.dueAt && task.status !== 'completed' ? dueInfo(task.dueAt) : null

  // Keyboard/touch alternative to drag-and-drop: every move is also a menu action.
  const moveItems: MenuItem[] = !canMove
    ? []
    : taskStatuses
        .filter((s) => s !== task.status)
        .map((s) => ({
          label:
            s === 'completed'
              ? 'Mark complete'
              : task.status === 'completed'
                ? `Reopen as ${taskStatusMeta[s].label.toLowerCase()}`
                : `Move to ${taskStatusMeta[s].label}`,
          icon: s === 'completed' ? CircleCheck : task.status === 'completed' ? RotateCcw : ArrowRight,
          onSelect: () => onMove(s),
        }))

  return (
    <article
      draggable={canMove}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative cursor-grab rounded-[10px] border border-line bg-surface p-3 shadow-xs transition-[border-color,box-shadow,opacity] hover:border-line-strong hover:shadow-card active:cursor-grabbing',
        dragging && 'opacity-50',
        task.status === 'completed' && 'bg-surface/70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={pr.tone} dot={task.priority === 'urgent'}>
          {pr.label}
        </Badge>
        <div className="relative z-10 flex items-center gap-1">
          {due && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-2xs tabular-nums',
                due.state === 'overdue' ? 'font-medium text-danger' : due.state === 'soon' ? 'font-medium text-warning' : 'text-muted-strong',
              )}
            >
              <Clock className="size-3" aria-hidden />
              {due.label}
            </span>
          )}
          {(canEdit || canMove) && (
            <Menu
              label={`Actions for ${task.title}`}
              trigger={<MoreHorizontal className="size-4" aria-hidden />}
              triggerClassName="size-7 -mr-1"
              items={
                canEdit
                  ? [
                      { label: 'Edit task', icon: Pencil, onSelect: onOpen },
                      ...moveItems,
                      'separator',
                      {
                        label: 'Delete task',
                        icon: Trash2,
                        danger: true,
                        onSelect: onDelete,
                      },
                    ]
                  : moveItems
              }
            />
          )}
        </div>
      </div>
      <h3 className="mt-2 text-[13.5px] font-medium leading-snug text-ink">
        {/* The title is the primary (stretched) click target that opens the task. */}
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'text-left after:absolute after:inset-0 after:content-[""]',
            task.status === 'completed' && 'text-muted-strong line-through decoration-line-strong',
          )}
        >
          {task.title}
        </button>
      </h3>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-2xs text-muted-strong">{context}</span>
        {assignee ? (
          <span title={assignee.name} className="relative z-10">
            <Avatar name={assignee.name} size="xs" />
          </span>
        ) : (
          <span className="shrink-0 rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-2xs text-muted-strong">Unassigned</span>
        )}
      </div>
    </article>
  )
}
