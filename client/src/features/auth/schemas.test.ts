import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './schemas'

describe('loginSchema', () => {
  it('requires email and password', () => {
    const r = loginSchema.safeParse({ email: '', password: '' })
    expect(r.success).toBe(false)
  })
  it('rejects malformed email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
  it('trims and accepts valid input', () => {
    const r = loginSchema.safeParse({ email: '  a@b.co ', password: 'x' })
    expect(r.success && r.data.email).toBe('a@b.co')
  })
})

describe('registerSchema', () => {
  const valid = { role: 'volunteer', name: 'Ana Ruiz', email: 'ana@example.org', password: 'secret123' }
  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })
  it.each([
    ['short password', { password: 'ab1' }],
    ['password without number', { password: 'abcdefgh' }],
    ['password without letter', { password: '12345678' }],
    ['unknown role', { role: 'admin' }],
    ['one-letter name', { name: 'A' }],
  ])('rejects %s', (_label, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})
