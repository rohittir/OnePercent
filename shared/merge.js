// @ts-check
// How two copies of a player's progress become one (docs/ARCHITECTURE.md, "Merge rules").
// Every function is commutative, associative and idempotent, so devices converge whatever order they sync in.
import { passed } from './levels.js'

/**
 * A game's result on one date, over every play of it that day.
 * @typedef {{ skill: string, best: number, top: number, playedAt: number }} Result
 *   best: the best score (0 to 1); top: the highest level passed that day, -1 for none; playedAt: the latest play.
 * @typedef {Record<string, Result>} Results results of one date, by game id
 * @typedef {Record<string, Results>} Days results by date (YYYY-MM-DD)
 * @typedef {{ name: string, age: number, muted: boolean, updatedAt: number }} Profile
 */

export const PROFILE_FIELDS = /** @type {const} */ (['name', 'age', 'muted', 'updatedAt'])

/**
 * A result in today's shape. Before 7 November 2026 a result was one play: { skill, score, level, rounds, playedAt }.
 * @param {any} r
 * @returns {Result}
 */
export function normalizeResult(r) {
  if ('best' in r) return r
  return { skill: r.skill, best: r.score, top: passed(r.score) ? r.level : -1, playedAt: r.playedAt }
}

/**
 * Field by field, the larger: the best score, the highest level passed, the latest play.
 * @param {Result | undefined} a
 * @param {Result | undefined} b
 * @returns {Result | undefined}
 */
export function mergeResult(a, b) {
  if (!a || !b) return a ?? b ? normalizeResult(a ?? b) : undefined
  const x = normalizeResult(a)
  const y = normalizeResult(b)
  return { skill: x.skill, best: Math.max(x.best, y.best), top: Math.max(x.top, y.top), playedAt: Math.max(x.playedAt, y.playedAt) }
}

/** @param {Result} a @param {Result} b */
export const sameResult = (a, b) => a.skill === b.skill && a.best === b.best && a.top === b.top && a.playedAt === b.playedAt

/**
 * @param {Results} [a]
 * @param {Results} [b]
 * @returns {Results}
 */
export function mergeResults(a = {}, b = {}) {
  /** @type {Results} */
  const out = {}
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) out[id] = /** @type {Result} */ (mergeResult(a[id], b[id]))
  return out
}

/**
 * @param {Days} [a]
 * @param {Days} [b]
 * @returns {Days}
 */
export function mergeDays(a = {}, b = {}) {
  const out = { ...a }
  for (const [date, results] of Object.entries(b)) out[date] = mergeResults(out[date], results)
  return out
}

/**
 * A flat object as text with its keys sorted, so a copy read back from the table (keys in another order) compares equal.
 * @param {Record<string, unknown>} value
 */
const key = (value) => JSON.stringify(Object.keys(value).sort().map((k) => [k, value[k]]))

/**
 * The later edit wins; on a tie, a fixed order.
 * @template {Profile} T
 * @param {T} a
 * @param {Profile} b
 * @returns {T} a with b's profile fields when b wins
 */
export function mergeProfile(a, b) {
  const pick = (/** @type {Profile} */ p) => Object.fromEntries(PROFILE_FIELDS.map((f) => [f, p[f]]))
  if (b.updatedAt > a.updatedAt || (b.updatedAt === a.updatedAt && key(pick(b)) > key(pick(a)))) return { ...a, ...pick(b) }
  return a
}
