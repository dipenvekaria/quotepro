import { describe, expect, it } from 'vitest'

/**
 * The `?next=` parameter on /login is attacker-controllable — it is a query
 * string on a public page. Two things read it, and both need bounding:
 *
 *  - `use-auth.ts` redirects there after sign-in. It requires a leading `/`,
 *    which is what stops `?next=https://evil.example` turning sign-in into an
 *    open redirect.
 *  - the login page extracts an invitation token from it and hands that to a
 *    server action.
 *
 * These lock the pattern used for the second. It is duplicated here rather than
 * imported because the source is a client module in a route file; if it ever
 * moves to src/lib, import it and delete the copy.
 */
const JOIN_NEXT = /^\/join\/([A-Za-z0-9_-]{16,128})$/

const tokenFrom = (next: string | null) => next?.match(JOIN_NEXT)?.[1]

describe('join token extraction from ?next=', () => {
  it('accepts a real invite path', () => {
    const token = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'
    expect(tokenFrom(`/join/${token}`)).toBe(token)
  })

  it('ignores an absolute URL', () => {
    // Without the leading-slash anchor this would happily pull a token out of
    // a link pointing at someone else's host.
    expect(tokenFrom('https://evil.example/join/a1b2c3d4e5f6a7b8c9d0e1f2')).toBeUndefined()
    expect(tokenFrom('//evil.example/join/a1b2c3d4e5f6a7b8c9d0e1f2')).toBeUndefined()
  })

  it('ignores anything that is not exactly a join path', () => {
    expect(tokenFrom('/app/dashboard')).toBeUndefined()
    expect(tokenFrom('/join/')).toBeUndefined()
    expect(tokenFrom('/join/abc')).toBeUndefined() // too short to be a token
    expect(tokenFrom('/join/a1b2c3d4e5f6a7b8c9d0e1f2/../../admin')).toBeUndefined()
    expect(tokenFrom(null)).toBeUndefined()
  })

  it('rejects tokens with characters a hex token never contains', () => {
    expect(tokenFrom('/join/a1b2c3d4e5f6a7b8%20c9d0')).toBeUndefined()
    expect(tokenFrom("/join/a1b2c3d4e5f6a7b8'or'1")).toBeUndefined()
  })

  it('bounds the length', () => {
    expect(tokenFrom(`/join/${'a'.repeat(129)}`)).toBeUndefined()
    expect(tokenFrom(`/join/${'a'.repeat(128)}`)).toBe('a'.repeat(128))
  })
})
