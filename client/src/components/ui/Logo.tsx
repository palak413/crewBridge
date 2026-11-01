import { cn } from '../../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M7 21.5c2.6-5.2 5.6-7.8 9-7.8s6.4 2.6 9 7.8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 21.5v-3.2M16 21.5v-7.8M21 21.5v-3.2" stroke="#E8F0EA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'white' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[15px] font-semibold tracking-[-0.01em]', tone === 'white' ? 'text-white' : 'text-ink')}>
        CrewBridge
      </span>
    </span>
  )
}
