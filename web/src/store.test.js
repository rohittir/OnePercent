// @ts-check
import { beforeEach, expect, test } from 'vitest'
import { addPlayer, applySync, findPlayer, getState, importPlayer, recordResult, removePlayer, resetForTests, setMuted } from './store.js'

beforeEach(resetForTests)
const result = (/** @type {number} */ score, playedAt = 1) => ({ skill: 'memory', score, level: 5, rounds: 5, playedAt })
const profile = { name: 'Maya', age: 8, muted: false, updatedAt: 1 }

test('a new player starts at the levels of their age, needs a sync, and is current', () => {
  const p = addPlayer({ name: ' Maya ', age: 8, pin: '4821' })
  expect(p.name).toBe('Maya')
  expect(p.startLevels).toEqual({ memory: 5, focus: 5, logic: 5, speed: 5 })
  expect(p.code).toBeNull()
  expect(getState().current).toBe(p.localId)
  expect(JSON.parse(localStorage.getItem('onepercent:v1') ?? '{}').players).toHaveLength(1)
})

test('a result keeps the better of two plays and marks its date dirty', () => {
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  recordResult(localId, '2026-11-06', 'echo', result(0.8))
  recordResult(localId, '2026-11-06', 'echo', result(0.4, 2))
  const p = findPlayer(localId)
  expect(p?.days['2026-11-06'].echo.score).toBe(0.8)
  expect(p?.dirty).toEqual({ '2026-11-06': 2 })
})

test('a sync clears only what did not change while it was out', () => {
  const { localId } = addPlayer({ name: 'Maya', age: 8, pin: '4821' })
  recordResult(localId, '2026-11-05', 'echo', result(0.8))
  recordResult(localId, '2026-11-06', 'echo', result(0.6))
  const before = /** @type {import('./store.js').Player} */ (findPlayer(localId))
  const sent = { dirty: { ...before.dirty }, profileDirty: before.profileDirty }
  recordResult(localId, '2026-11-06', 'echo', result(1, 3)) // while the request is out
  setMuted(localId, true)
  applySync(localId, sent, {
    code: 'brave-otter-27', token: 't', profile, rev: 4,
    days: { '2026-11-04': { odd: { skill: 'focus', score: 1, level: 5, rounds: 5, playedAt: 1 } } },
  })
  const p = findPlayer(localId)
  expect(p?.code).toBe('brave-otter-27')
  expect(p?.rev).toBe(4)
  expect(Object.keys(p?.dirty ?? {})).toEqual(['2026-11-06'])
  expect(p?.days['2026-11-04'].odd.score).toBe(1)
  expect(p?.muted).toBe(true) // the local edit is newer than the server's profile
  expect(p?.profileDirty).toBeGreaterThan(0)
})

test('joining a code already on the device merges into it', () => {
  importPlayer({ code: 'brave-otter-27', token: 'a', pin: '4821', profile, startLevels: { memory: 5 }, days: {}, rev: 1 })
  const first = getState().current
  importPlayer({ code: 'brave-otter-27', token: 'b', pin: '4821', profile, startLevels: { memory: 5 }, rev: 2,
    days: { '2026-11-06': { echo: result(1) } } })
  expect(getState().players).toHaveLength(1)
  expect(getState().current).toBe(first)
  expect(findPlayer(/** @type {string} */ (first))?.token).toBe('b')
  removePlayer(/** @type {string} */ (first))
  expect(getState()).toEqual({ players: [], current: null })
})
