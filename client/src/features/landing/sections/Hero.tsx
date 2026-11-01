import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '../../../components/ui/Button'
import { ProductPreview } from './ProductPreview'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-70" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] text-muted-strong shadow-xs">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            For event teams, crews and volunteer programs
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-balance text-[36px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[48px] lg:text-[56px]"
          >
            Bring your people, plans and progress together.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-muted-strong sm:text-[17px]">
            One workspace to coordinate volunteers, manage tasks and communicate in real time. Make every event run smoothly.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <ButtonLink to="/register" size="lg" trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
              Get started
            </ButtonLink>
            <a
              href="#product"
              className="inline-flex h-11 items-center justify-center rounded-control border border-line-strong bg-surface px-5 text-[15px] font-medium text-ink shadow-xs transition-colors hover:bg-subtle"
            >
              Explore the platform
            </a>
          </div>
        </div>

        <div id="product" className="mx-auto mt-14 max-w-5xl scroll-mt-24 sm:mt-16">
          <ProductPreview />
        </div>
      </div>
    </section>
  )
}
