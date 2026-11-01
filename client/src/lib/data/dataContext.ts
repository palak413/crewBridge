import { QueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { ApiError } from '../api/client'
import type { DataSource } from './source'

export const DataSourceContext = createContext<DataSource | null>(null)

export function useDataSource() {
  const src = useContext(DataSourceContext)
  if (!src) throw new Error('useDataSource must be used inside <DataProvider>')
  return src
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry once for network/server hiccups only; auth, permission and validation errors are final.
        retry: (count, err) => count < 1 && (!(err instanceof ApiError) || err.code === 'SERVER_UNAVAILABLE'),
      },
      mutations: { retry: 0 },
    },
  })
}
