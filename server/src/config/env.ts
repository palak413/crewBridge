import { z } from 'zod'

/**
 * Validated environment. The server refuses to start in production without a database and a strong
 * JWT secret. In development/test, missing values fall back to safe local defaults (with warnings).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().trim().optional().transform((v) => v || undefined),
  JWT_SECRET: z.string().trim().optional().transform((v) => v || undefined),
  CLIENT_ORIGIN: z.string().trim().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  /** Proxy hops in front of the app (Render = 1; Vercel rewrite → Render = 2). */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  NEXCONN_APP_KEY: z.string().trim().optional().transform((v) => v || undefined),
  NEXCONN_APP_SECRET: z.string().trim().optional().transform((v) => v || undefined),
  NEXCONN_AREA: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.enum(['SG', 'NA', 'SA', 'OM']).optional()),
  NEXCONN_API_BASE: z.string().trim().optional().transform((v) => v || undefined),
  NEXCONN_API_BACKUP: z.string().trim().optional().transform((v) => v || undefined),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export type Env = {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  mongoUri: string | undefined
  jwtSecret: string
  clientOrigins: string[]
  bcryptRounds: number
  cookieSecure: boolean
  trustProxy: number
  /** Nexconn chat; null when not configured (messaging is then unavailable, the rest of the app works). */
  nexconn: NexconnConfig | null
}

export type NexconnArea = 'SG' | 'NA' | 'SA' | 'OM'
export interface NexconnConfig {
  appKey: string
  /** Server-only. Never sent to the client or logged. */
  appSecret: string
  area: NexconnArea
  apiBase: string
  apiBackup: string | null
}

/** Server API hosts per data center (docs: platform-chat-api/prepare-to-use-api/base-url). */
const API_HOSTS: Partial<Record<NexconnArea, [string, string]>> = {
  SG: ['https://api.sg-light-api.com', 'https://api-b.sg-light-api.com'],
  NA: ['https://api.us-light-api.com', 'https://api-b.us-light-api.com'],
  SA: ['https://api.sau-light-api.com', 'https://api-b.sau-light-api.com'],
}

function nexconnConfig(e: z.output<typeof schema>): NexconnConfig | null {
  const parts = [e.NEXCONN_APP_KEY, e.NEXCONN_APP_SECRET, e.NEXCONN_AREA]
  if (parts.every((v) => !v)) return null
  if (parts.some((v) => !v)) throw new Error('Nexconn chat needs NEXCONN_APP_KEY, NEXCONN_APP_SECRET and NEXCONN_AREA together')
  const area = e.NEXCONN_AREA!
  const hosts = API_HOSTS[area]
  const apiBase = e.NEXCONN_API_BASE ?? hosts?.[0]
  if (!apiBase) throw new Error(`NEXCONN_API_BASE is required for data center ${area}`)
  return {
    appKey: e.NEXCONN_APP_KEY!,
    appSecret: e.NEXCONN_APP_SECRET!,
    area,
    apiBase: apiBase.replace(/\/$/, ''),
    apiBackup: (e.NEXCONN_API_BACKUP ?? (e.NEXCONN_API_BASE ? undefined : hosts?.[1]))?.replace(/\/$/, '') ?? null,
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  const e = parsed.data
  const prod = e.NODE_ENV === 'production'

  if (prod && !e.MONGODB_URI) throw new Error('MONGODB_URI is required in production')
  if (prod && (!e.JWT_SECRET || e.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production')

  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    mongoUri: e.MONGODB_URI,
    // Development-only fallback; never used in production (checked above).
    jwtSecret: e.JWT_SECRET ?? 'crewbridge-dev-only-secret-do-not-use-in-production',
    clientOrigins: e.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
    bcryptRounds: e.NODE_ENV === 'test' ? 4 : e.BCRYPT_ROUNDS,
    cookieSecure: e.COOKIE_SECURE ?? prod,
    trustProxy: e.TRUST_PROXY,
    nexconn: nexconnConfig(e),
  }
}
