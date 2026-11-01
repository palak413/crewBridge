import { createHash, randomBytes } from 'node:crypto'
import type { NexconnConfig } from '../../config/env'

/**
 * Nexconn Server API client (docs: platform-chat-api).
 * - Signature: SHA1(AppSecret + Nonce + Timestamp), Timestamp in milliseconds, Nonce ≤ 18 chars.
 * - Failover: on timeout (5 s) or an unexpected HTTP status, switch to the backup host and keep using it.
 * The App Secret never leaves this module.
 */
export class NexconnError extends Error {
  readonly code: number | null
  readonly status: number | null
  constructor(message: string, code: number | null, status: number | null) {
    super(message)
    this.code = code
    this.status = status
  }
}

export type Fetch = typeof fetch

export function signatureHeaders(cfg: Pick<NexconnConfig, 'appKey' | 'appSecret'>, now = Date.now()) {
  const nonce = randomBytes(9).toString('hex') // 18 hex chars
  const timestamp = String(now)
  const signature = createHash('sha1').update(cfg.appSecret + nonce + timestamp).digest('hex')
  return { 'App-Key': cfg.appKey, Nonce: nonce, Timestamp: timestamp, Signature: signature }
}

export function createNexconnClient(cfg: NexconnConfig, fetchImpl: Fetch = fetch) {
  let host = cfg.apiBase

  async function attempt(base: string, path: string, body: unknown) {
    const res = await fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: { ...signatureHeaders(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    })
    if (res.status === 401) throw new NexconnError('Nexconn rejected the API signature (check App Key/Secret and data center).', null, 401)
    if (!res.ok) throw Object.assign(new NexconnError(`Nexconn API HTTP ${res.status}`, null, res.status), { retryable: true })
    const json = (await res.json()) as { code: number; msg?: string; message?: string; result?: unknown }
    if (json.code !== 0) throw new NexconnError(`Nexconn API error ${json.code}${json.msg ? `: ${json.msg}` : ''}`, json.code, res.status)
    return json
  }

  async function post<T = unknown>(path: string, body: unknown): Promise<{ code: number; result?: T }> {
    try {
      return (await attempt(host, path, body)) as { code: number; result?: T }
    } catch (err) {
      const retryable = (err as { retryable?: boolean }).retryable || (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'TypeError'))
      const backup = host === cfg.apiBase ? cfg.apiBackup : cfg.apiBase
      if (!retryable || !backup) throw err
      host = backup
      return (await attempt(host, path, body)) as { code: number; result?: T }
    }
  }

  const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))

  return {
    /** POST /v4/auth/access-token/issue → result.accessToken */
    async issueAccessToken(userId: string, name: string) {
      const r = await post<{ accessToken: string; userId: string }>('/v4/auth/access-token/issue', { userId, name: name.slice(0, 64) })
      if (!r.result?.accessToken) throw new NexconnError('Nexconn returned no access token', r.code, 200)
      return r.result.accessToken
    },
    /** POST /v4/group-channel/create (≤30 invitees per call; the rest are added with join). */
    async createGroup(channelId: string, name: string, owner: string, userIds: string[]) {
      const others = userIds.filter((u) => u !== owner)
      await post('/v4/group-channel/create', { channelId, name: name.slice(0, 64), owner, userIds: others.slice(0, 30) })
      if (others.length > 30) await this.join(channelId, others.slice(30))
    },
    /** POST /v4/group-channel/join (≤100 users per call). */
    async join(channelId: string, userIds: string[]) {
      for (const batch of chunks(userIds, 100)) await post('/v4/group-channel/join', { channelId, userIds: batch })
    },
    /** POST /v4/group-channel/leave (≤100 users per call). */
    async leave(channelId: string, userIds: string[]) {
      for (const batch of chunks(userIds, 100)) await post('/v4/group-channel/leave', { channelId, userIds: batch })
    },
    /** POST /v4/group-channel/dismiss */
    async dismiss(channelId: string) {
      await post('/v4/group-channel/dismiss', { channelId })
    },
  }
}

export type NexconnClient = ReturnType<typeof createNexconnClient>
