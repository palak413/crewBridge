import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Lazy routes are transformed on first use; under a busy machine that can exceed the 1s default.
configure({ asyncUtilTimeout: 5_000 })

// App-area tests run in the demo workspace unless a test chooses otherwise.
beforeEach(() => localStorage.setItem('crewbridge.mode', 'demo'))

afterEach(() => {
  cleanup()
  // Each test starts from a fresh demo workspace.
  localStorage.clear()
  vi.restoreAllMocks()
})

// jsdom doesn't implement scrollTo, which ScrollRestoration calls.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
