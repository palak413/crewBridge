import { describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from './client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('apiRequest', () => {
  it('returns parsed JSON and sends cookies + JSON body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }))
    await expect(apiRequest('/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/x')
    expect(init?.credentials).toBe('include')
    expect(init?.body).toBe('{"a":1}')
  })

  it('maps network failures to SERVER_UNAVAILABLE', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'SERVER_UNAVAILABLE' })
  })

  it('maps a non-JSON gateway 5xx to SERVER_UNAVAILABLE', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad gateway', { status: 502 }))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'SERVER_UNAVAILABLE', status: 502 })
  })

  it('treats a 200 HTML page (SPA fallback) as unavailable, not success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    await expect(apiRequest('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('surfaces API error messages and field errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(422, { error: { code: 'VALIDATION', message: 'Check the form', fields: { email: 'Taken' } } }),
    )
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'VALIDATION', message: 'Check the form', fields: { email: 'Taken' } })
  })

  it('maps 401 to UNAUTHORIZED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, { error: { message: 'Invalid credentials' } }))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
