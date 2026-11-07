// @ts-check
// The 1%-a-day rules. Levels belong to skills, not games, so a new game starts at the child's level for its skill.

export const SKILLS = /** @type {const} */ (['memory', 'focus', 'logic', 'speed'])

/**
 * Tomorrow's level for a skill from today's score in it.
 * Good day (80%+) → one step harder; rough day (under 50%) → one step easier; otherwise hold.
 * @param {number} level
 * @param {number} score 0 to 1
 * @returns {number}
 */
export function nextLevel(level, score) {
  if (score >= 0.8) return level + 1
  if (score < 0.5) return Math.max(0, level - 1)
  return level
}

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
