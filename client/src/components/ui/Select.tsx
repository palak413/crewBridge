import { ChevronDown } from 'lucide-react'
import type { Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { inputClasses } from './Field'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  ref?: Ref<HTMLSelectElement>
}

/** Native select styled to match Input — keeps mobile pickers and accessibility for free. */
export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          inputClasses,
          'cursor-pointer appearance-none pr-9',
          invalid ? 'border-danger focus:border-danger focus:ring-danger/12' : 'border-line-strong hover:border-[#cdd5cf]',
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ invalid, className, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        inputClasses,
        'h-auto resize-y py-2.5 leading-6',
        invalid ? 'border-danger focus:border-danger focus:ring-danger/12' : 'border-line-strong hover:border-[#cdd5cf]',
        className,
      )}
      {...rest}
    />
  )
}
