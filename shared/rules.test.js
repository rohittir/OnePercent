// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ADJECTIVES, ANIMALS, CODE_PATTERN, makeCode, normalizeCode } from './ids.js'
import { mergeDays, mergeProfile, mergeResult, normalizeResult, sameResult } from './merge.js'
import { addDays, levelsOf, progress } from './progress.js'
import { ClaimBody, CreateBody, PairsPack, SyncBody } from './schemas.js'
import { PER_DAY, pickToday } from './today.js'
import { SKILLS, startLevels } from './levels.js'

const rand = (/** @type {number} */ n) => Math.floor(Math.random() * n)
/** @param {string} skill @param {number} best @param {number} top @param {number} [playedAt] */
const r = (skill, best, top, playedAt = 1) => ({ skill, best, top, playedAt })
/** @param {any} v @returns {any} the value with object keys sorted */
const sorted = (v) => (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v)
const start = { memory: 5, focus: 5, logic: 5, speed: 5 }

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

test('merge: field by field the larger — best score, highest level passed, latest play', () => {
  assert.deepEqual(mergeResult(r('memory', 0.8, 5, 9), r('memory', 1, -1, 3)), r('memory', 1, 5, 9))
  const a = { '2026-11-05': { echo: r('memory', 0.6, -1, 5) }, '2026-11-06': { echo: r('memory', 0.8, 6, 9) } }
  const b = { '2026-11-06': { echo: r('memory', 1, 5, 7), odd: r('focus', 0.4, -1, 8) } }
  const c = { '2026-11-06': { echo: r('memory', 0.9, 7, 2) } }
  const all = mergeDays(mergeDays(a, b), c)
  assert.deepEqual(all['2026-11-06'].echo, r('memory', 1, 7, 9))
  assert.deepEqual(all['2026-11-06'].odd, r('focus', 0.4, -1, 8))
  const orders = [[a, b, c], [c, b, a], [b, a, c], [a, c, b, b, a]]
  const results = orders.map((days) => JSON.stringify(sorted(days.reduce((acc, d) => mergeDays(acc, d), {}))))
  assert.equal(new Set(results).size, 1, 'every order converges, duplicates change nothing')
  assert.ok(sameResult(r('memory', 1, 2), { playedAt: 1, top: 2, best: 1, skill: 'memory' }), 'key order does not matter')
})

test('merge: a result of the old shape (one play) is read as today\'s', () => {
  assert.deepEqual(normalizeResult({ skill: 'memory', score: 0.8, level: 5, rounds: 5, playedAt: 4 }), r('memory', 0.8, 5, 4))
  assert.deepEqual(normalizeResult({ skill: 'memory', score: 0.6, level: 5, rounds: 5, playedAt: 4 }), r('memory', 0.6, -1, 4))
  assert.deepEqual(mergeResult({ skill: 'memory', score: 1, level: 5, rounds: 5, playedAt: 1 }, r('memory', 0.4, -1, 2)), r('memory', 1, 5, 2))
})

test('merge: the later profile edit wins, ties are order-free', () => {
  const p = { name: 'Maya', age: 8, muted: false, updatedAt: 10, code: 'brave-otter-27' }
  assert.equal(mergeProfile(p, { name: 'May', age: 8, muted: true, updatedAt: 11 }).muted, true)
  assert.equal(mergeProfile(p, { name: 'May', age: 8, muted: true, updatedAt: 9 }).muted, false)
  assert.equal(mergeProfile(p, { ...p, name: 'Zed' }).code, 'brave-otter-27')
  const t1 = { name: 'A', age: 8, muted: false, updatedAt: 5 }, t2 = { name: 'B', age: 8, muted: false, updatedAt: 5 }
  assert.equal(mergeProfile(t1, t2).name, mergeProfile(t2, t1).name)
})

test('levels: a pass unlocks the next level at once, a miss holds it, nothing lowers it', () => {
  assert.deepEqual(levelsOf(start, {}), start)
  const today = { '2026-11-06': { echo: r('memory', 0.6, -1), odd: r('focus', 1, 5) } }
  assert.deepEqual(levelsOf(start, today), { ...start, focus: 6 }, 'passed level 5 today: level 6 today, no waiting')
  const later = mergeDays(today, { '2026-11-06': { odd: r('focus', 0.8, 6, 2) }, '2026-11-07': { odd: r('focus', 0.2, -1, 3) } })
  assert.equal(levelsOf(start, later).focus, 7, 'two passes in a day: two levels; a later miss changes nothing')
  assert.equal(levelsOf({ ...start, logic: 30 }, { '2026-11-06': { next: r('logic', 1, 10) } }).logic, 30, 'never below the start')
  assert.equal(levelsOf(start, { '2026-11-06': { echo: { skill: 'memory', score: 0.9, level: 5, rounds: 5, playedAt: 1 } } }).memory, 6, 'old shape')
})

test('progress: stars per game per day, streak of days played, growth of 1% per level passed', () => {
  const days = {
    '2026-11-04': { echo: r('memory', 1, 5), odd: r('focus', 1, 5) },
    '2026-11-05': { echo: r('memory', 0.4, -1) },
    '2026-11-06': { echo: r('memory', 0.9, 6) },
  }
  const p = progress({ startLevels: start, days }, '2026-11-06')
  assert.deepEqual(p.levels, { ...start, memory: 7, focus: 6 })
  assert.equal(p.gained, 3)
  assert.equal(p.growth.toFixed(4), (1.01 ** 3).toFixed(4))
  assert.equal(p.stars, 3 + 3 + 1 + 3)
  assert.equal(p.daysPlayed, 3)
  assert.equal(p.streak, 3)
  assert.equal(progress({ startLevels: start, days }, '2026-11-07').streak, 3, 'nothing yet today: the streak runs to yesterday')
  assert.equal(progress({ startLevels: start, days }, '2026-11-08').streak, 0, 'a missed day ends it')
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

test('daily mix: with more skills than four, four a day, rotating, always with the weakest skill', () => {
  const games = SKILLS.map((skill) => ({ id: skill, skill, ages: [7, 14] }))
  const start = startLevels(8)
  const dates = Array.from({ length: 7 }, (_, i) => addDays('2026-11-12', i))
  const sets = dates.map((date) => pickToday(games, { age: 8, date, levels: start, startLevels: start }).map((g) => g.skill))
  assert.ok(sets.every((s) => s.length === PER_DAY))
  assert.deepEqual(sets[0], ['memory', 'focus', 'logic', 'speed'], '2026-11-12 starts the rotation at the first skill')
  for (const skill of SKILLS) assert.equal(sets.filter((s) => s.includes(skill)).length, 4, `${skill}: four days in seven`)
  const ahead = { ...start, memory: 9, focus: 9, logic: 9, speed: 9, switch: 9, stop: 9 } // every skill moved but planning
  for (const date of dates) assert.ok(pickToday(games, { age: 8, date, levels: ahead, startLevels: start }).some((g) => g.skill === 'plan'))
  assert.deepEqual(pickToday(games, { age: 8, date: '2026-11-12' }).length, PER_DAY, 'works without levels too')
})

test('levels a day began with ignore that day\'s plays', () => {
  const days = { '2026-11-11': { echo: r('memory', 1, 5) }, '2026-11-12': { echo: r('memory', 1, 6) } }
  assert.equal(levelsOf(start, days, '2026-11-12').memory, 6)
  assert.equal(levelsOf(start, days).memory, 7)
})

test('schemas: bodies and packs are checked strictly', () => {
  const profile = { name: 'Maya', age: 8, muted: false, updatedAt: 1 }
  const day = { echo: r('memory', 1, 5), odd: r('focus', 0.6, -1) }
  assert.ok(CreateBody.safeParse({ profile, startLevels: start, pin: '4821', days: { '2026-11-06': day } }).success)
  assert.equal(CreateBody.safeParse({ profile, startLevels: start, pin: '482', days: {} }).success, false, 'PIN is 4 digits')
  assert.equal(CreateBody.safeParse({ profile: { ...profile, age: 20 }, startLevels: start, pin: '4821', days: {} }).success, false)
  assert.equal(SyncBody.safeParse({ since: 0, days: { '2026-11-06': { echo: r('memory', 2, 5) } } }).success, false, 'best ≤ 1')
  assert.equal(SyncBody.safeParse({ since: 0, days: { '2026-11-06': { echo: r('memory', 1, -2) } } }).success, false, 'top ≥ -1')
  assert.equal(SyncBody.safeParse({ since: 0, days: {}, extra: 1 }).success, false, 'unknown keys refused')
  assert.equal(ClaimBody.safeParse({ code: 'Brave-Otter-27', pin: '4821' }).success, false, 'IDs are normalized first')
  assert.ok(CreateBody.safeParse({ profile, startLevels: start, pin: '4821', days: {} }).success, 'a profile from before the new skills')
  assert.equal(CreateBody.safeParse({ profile, startLevels: { ...start, juggling: 3 }, pin: '4821', days: {} }).success, false)
  const pack = { id: 'starter', title: 'Starter pairs', type: 'pairs', ages: [7, 14], items: [{ a: 'b', b: 'd', level: 0 }] }
  assert.ok(PairsPack.safeParse(pack).success)
  assert.equal(PairsPack.safeParse({ ...pack, items: [{ a: 'b', b: 'b', level: 0 }] }).success, false)
})
