// @ts-check
// The 1% rules. Levels belong to skills, not games, so a new game starts at the child's level for its skill.
// A game passed at 80% or more unlocks the next level of its skill at once; there is no limit on retries, and a level never goes down.

// Working memory, attention, reasoning, processing speed, then (7 November 2026) switching rules, self-control and planning.
export const SKILLS = /** @type {const} */ (['memory', 'focus', 'logic', 'speed', 'switch', 'stop', 'plan'])

/** The score that passes a level and unlocks the next 1%. */
export const PASS = 0.8

/** @param {number} score 0 to 1 */
export const passed = (score) => score >= PASS

/**
 * Stars for one game's score. Finishing always earns one.
 * @param {number} score 0 to 1
 * @returns {1 | 2 | 3}
 */
export const starsFor = (score) => (score >= 0.9 ? 3 : score >= 0.6 ? 2 : 1)

/**
 * The level every skill starts at: older children start a few steps further along.
 * @param {number} age
 * @returns {Record<typeof SKILLS[number], number>}
 */
export function startLevels(age) {
  const level = Math.max(0, (age - 7) * 5)
  return Object.fromEntries(SKILLS.map((skill) => [skill, level]))
}
