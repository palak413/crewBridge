import { Link } from 'react-router'
import { Logo } from '../ui/Logo'
import { landingSections } from './landingSections'

const COPYRIGHT_YEAR = new Date().getFullYear()

export function PublicFooter() {
  const linkCls = 'text-[13.5px] text-muted-strong transition-colors hover:text-ink'
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-strong">Coordinate people. Move work forward.</p>
        </div>
        <nav aria-label="Product">
          <p className="text-[13px] font-medium text-ink">Product</p>
          <ul className="mt-3 space-y-2">
            {landingSections.map((s) => (
              <li key={s.href}>
                <a href={s.href} className={linkCls}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account">
          <p className="text-[13px] font-medium text-ink">Account</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/login" className={linkCls}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className={linkCls}>
                Create an account
              </Link>
            </li>
            <li>
              <Link to="/register?role=volunteer" className={linkCls}>
                Join as a volunteer
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {COPYRIGHT_YEAR} CrewBridge</p>
          <p>Built for the Nexconn Build Challenge 2026</p>
        </div>
      </div>
    </footer>
  )
}
