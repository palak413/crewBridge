import { FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useDataSource } from '../../lib/data/dataContext'
import { useResetDemo } from '../../lib/data/queries'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { errorMessage, useToast } from '../ui/toastContext'

/**
 * Shown whenever the app runs on the local demo data source.
 * Makes clear that data is demo data, stored only in this browser, and not shared.
 */
export function DemoBanner() {
  const src = useDataSource()
  const reset = useResetDemo()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  if (src.kind !== 'local-demo') return null

  return (
    <>
      <div
        role="note"
        className="mb-6 flex flex-col gap-2 rounded-control border border-sage-strong bg-sage/60 px-3.5 py-2.5 text-[13px] text-ink-soft sm:flex-row sm:items-center"
      >
        <FlaskConical className="hidden size-4 shrink-0 text-primary sm:block" aria-hidden />
        <p className="flex-1 leading-5">
          <span className="font-medium text-ink">Demo workspace.</span> Sample data, saved only in this browser and not shared with anyone. Sign in to use your live
          workspace.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => setConfirm(true)}
          leadingIcon={<RotateCcw className="size-3.5" aria-hidden />}
        >
          Reset demo data
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Reset the demo workspace?"
        body="Everything you've created or changed in this browser will be replaced with the original sample data."
        confirmLabel="Reset data"
        pending={reset.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => toast({ message: 'Demo workspace reset' }),
            onError: (err) => toast({ message: errorMessage(err), tone: 'danger' }),
            onSettled: () => setConfirm(false),
          })
        }
      />
    </>
  )
}
