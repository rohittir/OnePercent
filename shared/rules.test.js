// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ADJECTIVES, ANIMALS, CODE_PATTERN, makeCode, normalizeCode } from './ids.js'
import { betterResult, mergeDays, mergeProfile } from './merge.js'
import { addDays, isComplete, levelsAt, progress } from './progress.js'
import { ClaimBody, CreateBody, PairsPack, SyncBody } from './schemas.js'
import { pickToday } from './today.js'

const rand = (/** @type {number} */ n) => Math.floor(Math.random() * n)
/** @param {string} skill @param {number} score @param {number} [playedAt] */
const r = (skill, score, playedAt = 1) => ({ skill, score, level: 0, rounds: 5, playedAt })
const fullDay = (/** @type {number} */ score) => ({ echo: r('memory', score), odd: r('focus', score), next: r('logic', score), same: r('speed', score) })

test('ids: 128 × 128 unique words, codes match the pattern', () => {
  for (const list of [ADJECTIVES, ANIMALS]) {
    assert.equal(list.length, 128)
    assert.equal(new Set(list).size, 128)
    assert.ok(list.every((w) => /^[a-z]{2,10}$/.test(w)), 'lowercase letters only')
  }
  for (let i = 0; i < 200; i++) assert.match(makeCode(rand), CODE_PATTERN)
  assert.equal(normalizeCode('  Brave Otter 27 '), 'brave-otter-27')
  assert.equal(normalizeCode('brave__otter--27'), 'brave-otter-27')
})

test('merge: best score wins, any order, duplicates change nothing', () => {
  const a = { '2026-11-05': { echo: r('memory', 0.6, 5) }, '2026-11-06': { echo: r('memory', 0.8, 9) } }
  const b = { '2026-11-06': { echo: r('memory', 1, 7), odd: r('focus', 0.4, 8) } }
  const c = { '2026-11-06': { echo: r('memory', 1, 3) } }
  const ab = mergeDays(a, b)
  assert.equal(ab['2026-11-06'].echo.score, 1)
  assert.equal(ab['2026-11-06'].odd.score, 0.4)
  assert.equal(ab['2026-11-05'].echo.score, 0.6)
  const orders = [[a, b, c], [c, b, a], [b, a, c], [a, c, b, b, a]]
  /** @param {any} v @returns {any} the value with object keys sorted */
  const sorted = (v) => (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v)
  const results = orders.map((days) => JSON.stringify(sorted(days.reduce((acc, d) => mergeDays(acc, d), {}))))
  assert.equal(new Set(results).size, 1, 'every order converges')
  assert.equal(mergeDays(ab, ab)['2026-11-06'].echo.playedAt, 7, 'idempotent')
  // A tie on score keeps the earlier play; a full tie picks the same side either way.
  assert.equal(betterResult(r('memory', 1, 2), r('memory', 1, 1))?.playedAt, 1)
  const x = { ...r('memory', 1, 1), level: 3 }, y = { ...r('memory', 1, 1), level: 4 }
  assert.equal(betterResult(x, y), betterResult(y, x))
  const yReordered = { playedAt: 1, rounds: 5, level: 4, score: 1, skill: 'memory' }
  assert.equal(betterResult(x, yReordered)?.level, betterResult(yReordered, x)?.level, 'key order does not matter')
})

test('merge: the later profile edit wins, ties are order-free', () => {
  const p = { name: 'Maya', age: 8, muted: false, updatedAt: 10, code: 'brave-otter-27' }
  assert.equal(mergeProfile(p, { name: 'May', age: 8, muted: true, updatedAt: 11 }).muted, true)
  assert.equal(mergeProfile(p, { name: 'May', age: 8, muted: true, updatedAt: 9 }).muted, false)
  assert.equal(mergeProfile(p, { ...p, name: 'Zed' }).code, 'brave-otter-27')
  const t1 = { name: 'A', age: 8, muted: false, updatedAt: 5 }, t2 = { name: 'B', age: 8, muted: false, updatedAt: 5 }
  assert.equal(mergeProfile(t1, t2).name, mergeProfile(t2, t1).name)
})

test('progress: levels replay per skill, today does not count until tomorrow', () => {
  const start = { memory: 5, focus: 5, logic: 5, speed: 5 }
  const days = { '2026-11-04': fullDay(1), '2026-11-05': fullDay(0.4), '2026-11-06': { echo: r('memory', 0.9), echo2: r('memory', 0.3) } }
  assert.deepEqual(levelsAt(start, days, '2026-11-05'), { memory: 6, focus: 6, logic: 6, speed: 6 })
  const p = progress({ startLevels: start, days }, '2026-11-06')
  assert.deepEqual(p.levels, { memory: 5, focus: 5, logic: 5, speed: 5 })
  assert.equal(p.nextLevels.memory, 6, 'best score of the skill that day counts')
  assert.equal(p.daysPlayed, 2)
  assert.equal(p.streak, 2, 'today not finished yet: the streak runs to yesterday')
  assert.equal(p.stars, 4 * 3 + 4 * 1 + 3 + 1)
  assert.equal(p.growth.toFixed(4), (1.01 ** 2).toFixed(4))
  assert.equal(progress({ startLevels: start, days }, '2026-11-08').streak, 0, 'a missed day ends it')
  assert.equal(isComplete(days['2026-11-06']), false)
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('pickToday: one game per skill that fits the age, rotating by date', () => {
  const games = [
    { id: 'echo', skill: 'memory', ages: [7, 14] }, { id: 'odd', skill: 'focus', ages: [7, 14] },
    { id: 'next', skill: 'logic', ages: [7, 14] }, { id: 'same', skill: 'speed', ages: [7, 14] },
    { id: 'echo-big', skill: 'memory', ages: [11, 14] },
  ]
  assert.deepEqual(pickToday(games, { age: 8, date: '2026-11-06' }).map((g) => g.id), ['echo', 'odd', 'next', 'same'])
  const memory = ['2026-11-06', '2026-11-07'].map((date) => pickToday(games, { age: 12, date })[0].id)
  assert.deepEqual(memory.sort(), ['echo', 'echo-big'], 'consecutive days rotate')
})

test('schemas: bodies and packs are checked strictly', () => {
  const profile = { name: 'Maya', age: 8, muted: false, updatedAt: 1 }
  const startLevels = { memory: 5, focus: 5, logic: 5, speed: 5 }
  assert.ok(CreateBody.safeParse({ profile, startLevels, pin: '4821', days: { '2026-11-06': fullDay(1) } }).success)
  assert.equal(CreateBody.safeParse({ profile, startLevels, pin: '482', days: {} }).success, false, 'PIN is 4 digits')
  assert.equal(CreateBody.safeParse({ profile: { ...profile, age: 20 }, startLevels, pin: '4821', days: {} }).success, false)
  assert.equal(SyncBody.safeParse({ since: 0, days: { '2026-11-06': { echo: { ...r('memory', 2) } } } }).success, false, 'score ≤ 1')
  assert.equal(SyncBody.safeParse({ since: 0, days: {}, extra: 1 }).success, false, 'unknown keys refused')
  assert.equal(ClaimBody.safeParse({ code: 'Brave-Otter-27', pin: '4821' }).success, false, 'IDs are normalized first')
  const pack = { id: 'starter', title: 'Starter pairs', type: 'pairs', ages: [7, 14], items: [{ a: 'b', b: 'd', level: 0 }] }
  assert.ok(PairsPack.safeParse(pack).success)
  assert.equal(PairsPack.safeParse({ ...pack, items: [{ a: 'b', b: 'b', level: 0 }] }).success, false)
})
