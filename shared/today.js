// @ts-check
// Today's set: PER_DAY games, one per skill, from the games that fit the child's age. With more skills than that, the skills
// rotate by date and the child's weakest skill (fewest levels gained when the day began) is always in. Every game stays playable
// from Home; the set is the day's suggestion and what "all passed today" means.
import { SKILLS } from './levels.js'
import { dayNumber } from './progress.js'

export const PER_DAY = 4

/**
 * @template {{ id: string, skill: string, ages: readonly [number, number] | number[] }} G
 * @param {G[]} games in registry order
 * @param {{ age: number, date: string, levels?: Record<string, number>, startLevels?: Record<string, number> }} who
 *   levels: the levels the day began with, so the set holds still while the child plays
 * @returns {G[]} in skill order
 */
export function pickToday(games, { age, date, levels = {}, startLevels = {} }) {
  const day = dayNumber(date)
  const fits = (/** @type {G} */ g) => age >= g.ages[0] && age <= g.ages[1]
  const skills = SKILLS.filter((s) => games.some((g) => g.skill === s && fits(g)))
  let chosen = /** @type {string[]} */ (skills)
  if (skills.length > PER_DAY) {
    const rotated = skills.map((_, k) => skills[(day + k) % skills.length])
    const gained = (/** @type {string} */ s) => (levels[s] ?? 0) - (startLevels[s] ?? 0)
    const weakest = rotated.reduce((a, b) => (gained(b) < gained(a) ? b : a))
    const pick = [weakest, ...rotated.filter((s) => s !== weakest)].slice(0, PER_DAY)
    chosen = skills.filter((s) => pick.includes(s))
  }
  return chosen.map((skill) => {
    const fit = games.filter((g) => g.skill === skill && fits(g))
    return fit[day % fit.length]
  })
}
