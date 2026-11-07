// @ts-check
// Levels, stars, streak and growth, derived from the days a player has played (CLAUDE.md, rule 1). Never stored.
import { normalizeResult } from './merge.js'
import { starsFor } from './levels.js'

/** @typedef {import('./merge.js').Days} Days */

const DAY_MS = 86_400_000
/** @param {string} date YYYY-MM-DD @param {number} delta days @returns {string} */
export const addDays = (date, delta) => new Date(Date.parse(`${date}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10)
/** @param {string} date YYYY-MM-DD @returns {number} days since 1970-01-01 */
export const dayNumber = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)

/**
 * Each skill's level: one above the highest level passed in it, or its start level. It rises the moment a game is passed,
 * never falls, and does not depend on the order plays arrive in.
 * @param {Record<string, number>} startLevels
 * @param {Days} days
 * @returns {Record<string, number>}
 */
export function levelsOf(startLevels, days) {
  const levels = { ...startLevels }
  for (const results of Object.values(days)) {
    for (const raw of Object.values(results)) {
      const { skill, top } = normalizeResult(raw)
      if (top >= 0) levels[skill] = Math.max(levels[skill] ?? 0, top + 1)
    }
  }
  return levels
}

/**
 * @param {{ startLevels: Record<string, number>, days: Days }} player
 * @param {string} today YYYY-MM-DD on the device
 */
export function progress({ startLevels, days }, today) {
  const levels = levelsOf(startLevels, days)
  const played = (/** @type {string} */ date) => Object.keys(days[date] ?? {}).length > 0
  let streak = 0
  for (let date = played(today) ? today : addDays(today, -1); played(date); date = addDays(date, -1)) streak++
  const gained = Object.keys(levels).reduce((sum, skill) => sum + levels[skill] - (startLevels[skill] ?? 0), 0)
  return {
    levels,
    /** One star to three per game per day, for that day's best score. */
    stars: Object.values(days).flatMap((results) => Object.values(results)).reduce((sum, r) => sum + starsFor(normalizeResult(r).best), 0),
    daysPlayed: Object.keys(days).filter(played).length,
    streak,
    /** Levels passed since day one, over every skill: each one is 1%. */
    gained,
    growth: 1.01 ** gained,
  }
}
