import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
  destructive = true,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  destructive?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={pending}
            className={destructive ? 'bg-danger hover:bg-[#a9442f] active:bg-[#933a28]' : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-6 text-ink-soft">{body}</div>
    </Dialog>
  )
}
