import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest } from '../api/client'
import { chatStore } from '../chat/chatStore'
import { useDataSource } from '../data/dataContext'
import { setMode } from './mode'

/** Sign out of the live workspace (clears the server session) or leave the demo workspace. */
export function useSignOut() {
  const src = useDataSource()
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useCallback(async () => {
    if (src.kind === 'http') {
      // Even if the server is unreachable, forget the local session state.
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
    }
    await chatStore.stop()
    setMode(null)
    qc.clear()
    navigate('/login', { replace: true })
  }, [src, qc, navigate])
}
