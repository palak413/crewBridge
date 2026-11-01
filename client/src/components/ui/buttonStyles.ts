import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium ' +
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out ' +
  'disabled:pointer-events-none disabled:opacity-55 select-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-xs hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-surface text-ink border border-line-strong shadow-xs hover:bg-subtle hover:border-line-strong',
  ghost: 'text-ink-soft hover:bg-subtle hover:text-ink',
  subtle: 'bg-sage text-primary hover:bg-sage-strong',
  inverse: 'bg-white text-primary shadow-xs hover:bg-sage',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-[15px]',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
