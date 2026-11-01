import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '../../lib/cn'

export const inputClasses =
  'block w-full h-10 rounded-control border bg-surface px-3 text-sm text-ink placeholder:text-muted ' +
  'shadow-xs transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-primary focus:ring-3 focus:ring-primary/12 disabled:bg-subtle disabled:text-muted'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        inputClasses,
        invalid ? 'border-danger focus:border-danger focus:ring-danger/12' : 'border-line-strong hover:border-[#cdd5cf]',
        className,
      )}
      {...rest}
    />
  )
}

interface FieldProps {
  label: string
  /** Optional right-aligned element next to the label (e.g. a link). */
  labelAside?: ReactNode
  hint?: ReactNode
  error?: string
  children: (props: { id: string; 'aria-describedby'?: string; invalid: boolean }) => ReactNode
}

/** Wires label, hint and error text to a control with correct ARIA relationships. */
export function Field({ label, labelAside, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
          {label}
        </label>
        {labelAside}
      </div>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-strong">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
