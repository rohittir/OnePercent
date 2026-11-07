// @ts-check
// Levels, stars, streak and days played, derived from the days a player has played (CLAUDE.md, rule 1). Never stored.
import { nextLevel, SKILLS, starsFor } from './levels.js'

/** @typedef {import('./merge.js').Days} Days */

const DAY_MS = 86_400_000
/** @param {string} date YYYY-MM-DD @param {number} delta days @returns {string} */
export const addDays = (date, delta) => new Date(Date.parse(`${date}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10)
/** @param {string} date YYYY-MM-DD @returns {number} days since 1970-01-01 */
export const dayNumber = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)

/**
 * Replays the days in date order. Each skill moves once a day, by the best score of that skill that day.
 * @param {Record<string, number>} startLevels
 * @param {Days} days
 * @param {string} [before] only days before this date
 * @returns {Record<string, number>}
 */
export function levelsAt(startLevels, days, before) {
  const levels = { ...startLevels }
  for (const date of Object.keys(days).sort()) {
    if (before && date >= before) break
    /** @type {Record<string, number>} */
    const best = {}
    for (const { skill, score } of Object.values(days[date])) best[skill] = Math.max(best[skill] ?? 0, score)
    for (const [skill, score] of Object.entries(best)) levels[skill] = nextLevel(levels[skill] ?? 0, score)
  }
  return levels
}

/** @param {import('./merge.js').Results | undefined} results a date's results @returns {boolean} true when every skill was played */
export const isComplete = (results) => SKILLS.every((skill) => Object.values(results ?? {}).some((r) => r.skill === skill))

/**
 * @param {{ startLevels: Record<string, number>, days: Days }} player
 * @param {string} today YYYY-MM-DD on the device
 */
export function progress({ startLevels, days }, today) {
  const complete = Object.keys(days).filter((date) => isComplete(days[date]))
  let streak = 0
  for (let date = isComplete(days[today]) ? today : addDays(today, -1); isComplete(days[date]); date = addDays(date, -1)) streak++
  return {
    /** Levels to play today at: every day before today. */
    levels: levelsAt(startLevels, days, today),
    /** Levels after today's results, for tomorrow. */
    nextLevels: levelsAt(startLevels, days),
    stars: Object.values(days).flatMap((results) => Object.values(results)).reduce((sum, r) => sum + starsFor(r.score), 0),
    daysPlayed: complete.length,
    streak,
    /** 1% a day: 1.01 to the power of the days played. */
    growth: 1.01 ** complete.length,
  }
}
