import { useEffect } from 'react'
import { PublicFooter } from '../../components/layout/PublicFooter'
import { PublicHeader } from '../../components/layout/PublicHeader'
import { Features } from './sections/Features'
import { FinalCta } from './sections/FinalCta'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { ProblemSolution } from './sections/ProblemSolution'
import { UseCases } from './sections/UseCases'

export function LandingPage() {
  useEffect(() => {
    document.title = 'CrewBridge — Coordinate people. Move work forward.'
  }, [])
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <UseCases />
        <FinalCta />
      </main>
      <PublicFooter />
    </div>
  )
}
