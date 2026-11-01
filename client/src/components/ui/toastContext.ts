import { createContext, useContext } from 'react'
import { ApiError } from '../../lib/api/client'

export interface ToastInput {
  message: string
  tone?: 'success' | 'danger'
}

export const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx.toast
}

/** Readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  return err instanceof ApiError ? err.message : fallback
}
