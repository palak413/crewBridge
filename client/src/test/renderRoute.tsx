import { expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/router'

/** Render the real route tree at a given path, waiting for lazy route modules to load. */
export async function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const result = render(<RouterProvider router={router} />)
  // `initialized` flips before React commits the lazily-loaded page, so also wait for real content
  // (the hydrate fallback is an empty div).
  await waitFor(() => {
    expect(router.state.initialized).toBe(true)
    expect(result.container.textContent?.trim()).not.toBe('')
  })
  return { user, router, ...result }
}
