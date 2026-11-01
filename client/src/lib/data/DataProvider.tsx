import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { createQueryClient, DataSourceContext } from './dataContext'
import { createLocalDemoSource, STORAGE_KEY } from './localDemoSource'
import type { DataSource } from './source'

/**
 * Provides the active data source and query cache to the app area.
 * Milestone 3 swaps `createLocalDemoSource()` for the HTTP source here — nothing else changes.
 */
export function DataProvider({ children, source, client }: { children: ReactNode; source?: DataSource; client?: QueryClient }) {
  const [src] = useState(() => source ?? createLocalDemoSource())
  const [qc] = useState(() => client ?? createQueryClient())

  // Keep multiple tabs of the demo workspace in sync.
  useEffect(() => {
    if (src.kind !== 'local-demo') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void qc.invalidateQueries({ queryKey: ['cb'] })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [src, qc])

  return (
    <DataSourceContext.Provider value={src}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </DataSourceContext.Provider>
  )
}
