import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../../../components/ui/Button'

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6 lg:pb-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[20px] bg-primary px-6 py-14 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative">
          <h2 id="cta-title" className="mx-auto max-w-2xl text-balance text-[28px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[34px]">
            Run your next event from one calm, shared workspace.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-7 text-white/75">
            Set up your event, invite your crew and start coordinating in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink to="/register" variant="inverse" size="lg" trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
              Get started
            </ButtonLink>
            <Link to="/register?role=volunteer" className="inline-flex h-11 items-center px-4 text-[15px] font-medium text-white/85 transition-colors hover:text-white">
              Join as a volunteer
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
