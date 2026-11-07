// @ts-check
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { addPlayer, findPlayer, recordResult, resetForTests } from './store.js'
import { syncAll, syncState } from './sync.js'

/** @type {{ method: string, url: string, body: any, auth?: string }[]} */
let calls = []
/** @type {(call: { method: string, url: string, body: any }) => { status: number, body?: any }} */
let answer

beforeEach(() => {
  resetForTests()
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (/** @type {string} */ url, /** @type {RequestInit} */ init) => {
    const call = { method: String(init.method), url, body: init.body ? JSON.parse(String(init.body)) : undefined, auth: /** @type {any} */ (init.headers)?.authorization }
    calls.push(call)
    const { status, body } = answer(call)
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
  }))
})
afterEach(() => vi.unstubAllGlobals())

const profile = { name: 'Maya', age: 8, muted: false, updatedAt: 1 }

test('the first sync creates the player with what was played offline; later ones send only dirty days', async () => {
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  recordResult(localId, '2026-11-06', 'echo', { skill: 'memory', score: 1, level: 5, rounds: 5, playedAt: 1 })
  answer = () => ({ status: 201, body: { code: 'brave-otter-27', token: 'tok', profile, days: {}, rev: 1 } })
  await syncAll()
  expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/v1/players', body: { pin: '4821', profile: { name: 'Maya', age: 8 } } })
  expect(Object.keys(calls[0].body.days)).toEqual(['2026-11-06'])
  let p = findPlayer(localId)
  expect(p?.code).toBe('brave-otter-27')
  expect(p && syncState(p)).toBe('saved')

  recordResult(localId, '2026-11-07', 'echo', { skill: 'memory', score: 0.6, level: 5, rounds: 5, playedAt: 2 })
  answer = () => ({ status: 200, body: { profile, days: { '2026-11-08': {} }, rev: 3 } })
  await syncAll()
  expect(calls[1]).toMatchObject({ method: 'POST', url: '/api/v1/players/brave-otter-27/sync', auth: 'Bearer tok', body: { since: 1 } })
  expect(Object.keys(calls[1].body.days)).toEqual(['2026-11-07'])
  expect(calls[1].body.profile).toBeUndefined()
  p = findPlayer(localId)
  expect(p?.rev).toBe(3)
  expect(p?.dirty).toEqual({})
})

test('a token the server refuses unlinks the player, and it stops syncing', async () => {
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  answer = () => ({ status: 201, body: { code: 'brave-otter-27', token: 'tok', profile, days: {}, rev: 0 } })
  await syncAll()
  answer = () => ({ status: 401, body: { error: 'unauthorized' } })
  recordResult(localId, '2026-11-06', 'echo', { skill: 'memory', score: 1, level: 5, rounds: 5, playedAt: 1 })
  await syncAll()
  const p = findPlayer(localId)
  expect(p?.unlinked).toBe(true)
  expect(p && syncState(p)).toBe('unlinked')
  await syncAll()
  expect(calls).toHaveLength(2)
})

test('a sync with no players yet does not block the next one', async () => {
  answer = () => ({ status: 201, body: { code: 'brave-otter-27', token: 'tok', profile, days: {}, rev: 0 } })
  await syncAll() // the app opens on "New player": nobody to sync
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  await syncAll()
  expect(calls).toHaveLength(1)
  expect(findPlayer(localId)?.code).toBe('brave-otter-27')
})

test('offline keeps everything dirty for later', async () => {
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  answer = () => { throw new TypeError('Failed to fetch') }
  await syncAll()
  expect(findPlayer(localId)?.code).toBeNull()
  expect(findPlayer(localId)?.profileDirty).toBe(1)
})
