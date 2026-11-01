/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path for API requests. Defaults to `/api` (proxied in dev, rewritten on Vercel). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
