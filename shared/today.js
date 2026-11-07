// @ts-check
// Today's set: one game per skill from the games that fit the child's age. When a skill has several, the pick rotates by date,
// the same on every device and for every child, so a day's set never changes between devices.
import { SKILLS } from './levels.js'
import { dayNumber } from './progress.js'

/**
 * @template {{ id: string, skill: string, ages: readonly [number, number] | number[] }} G
 * @param {G[]} games in registry order
 * @param {{ age: number, date: string }} who
 * @returns {G[]} in skill order
 */
export function pickToday(games, { age, date }) {
  const day = dayNumber(date)
  return SKILLS.flatMap((skill) => {
    const fit = games.filter((g) => g.skill === skill && age >= g.ages[0] && age <= g.ages[1])
    return fit.length ? [fit[day % fit.length]] : []
  })
}
