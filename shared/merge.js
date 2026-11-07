// @ts-check
// How two copies of a player's progress become one (docs/ARCHITECTURE.md, "Merge rules").
// Every function is commutative and idempotent, so devices converge whatever order they sync in.

/** @typedef {{ skill: string, score: number, level: number, rounds: number, playedAt: number }} Result */
/** @typedef {Record<string, Result>} Results results of one date, by game id */
/** @typedef {Record<string, Results>} Days results by date (YYYY-MM-DD) */
/** @typedef {{ name: string, age: number, muted: boolean, updatedAt: number }} Profile */

export const PROFILE_FIELDS = /** @type {const} */ (['name', 'age', 'muted', 'updatedAt'])

/**
 * A flat object as text with its keys sorted, so a copy read back from the table (keys in another order) compares equal.
 * @param {Record<string, unknown>} value
 */
const key = (value) => JSON.stringify(Object.keys(value).sort().map((k) => [k, value[k]]))

/**
 * The higher score wins; on a tie the earlier play; on a full tie, a fixed order, so the pick never depends on which side is which.
 * @param {Result | undefined} a
 * @param {Result | undefined} b
 * @returns {Result | undefined} one of the two, never a copy
 */
export function betterResult(a, b) {
  if (!a || !b) return a ?? b
  if (a.score !== b.score) return a.score > b.score ? a : b
  if (a.playedAt !== b.playedAt) return a.playedAt < b.playedAt ? a : b
  return key(a) <= key(b) ? a : b
}

/**
 * @param {Results} [a]
 * @param {Results} [b]
 * @returns {Results}
 */
export function mergeResults(a = {}, b = {}) {
  const out = { ...a }
  for (const [gameId, result] of Object.entries(b)) out[gameId] = /** @type {Result} */ (betterResult(out[gameId], result))
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
