import { Menu, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { useDismiss } from '../../lib/useDismiss'
import { ButtonLink } from '../ui/Button'
import { Logo } from '../ui/Logo'
import { landingSections } from './landingSections'

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      className={cn(
        'sticky top-0 z-40 transition-[background-color,border-color] duration-200',
        scrolled || open ? 'border-b border-line bg-canvas/90 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link to="/" aria-label="CrewBridge home">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {landingSections.map((s) => (
              <li key={s.href}>
                <a href={s.href} className="rounded-lg px-3 py-2 text-[13.5px] text-ink-soft transition-colors hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ButtonLink to="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink to="/register">Get started</ButtonLink>
        </div>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-control text-ink-soft hover:bg-subtle md:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line px-4 pb-5 pt-3 md:hidden">
          <ul className="space-y-0.5">
            {landingSections.map((s) => (
              <li key={s.href}>
                <a href={s.href} onClick={close} className="block rounded-lg px-3 py-2.5 text-[15px] text-ink-soft hover:bg-subtle">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ButtonLink to="/login" variant="secondary" size="lg">
              Sign in
            </ButtonLink>
            <ButtonLink to="/register" size="lg">
              Get started
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  )
}
