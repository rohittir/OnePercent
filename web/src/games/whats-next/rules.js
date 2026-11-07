// @ts-check
import { rand, shuffle } from '../util.js'

/**
 * Six numbers that follow one rule; the child sees five and picks the sixth. New rule types unlock every 12 levels.
 * @param {number} level
 * @returns {number[]}
 */
export function makeSequence(level) {
  const type = rand(Math.min(4, 1 + Math.floor(level / 12)))
  const a = 1 + rand(9)
  const d = 2 + rand(4 + Math.floor(level / 10))
  const step = [
    (/** @type {number} */ x) => x + d, // add
    (/** @type {number} */ x) => x - d, // subtract
    (/** @type {number} */ x) => x * (2 + (d % 2)), // ×2 or ×3
    (/** @type {number} */ x, /** @type {number} */ i) => x + d + i, // growing step: +d, +d+1, +d+2…
  ][type]
  const seq = [type === 1 ? a + 6 * d : type === 2 ? 1 + rand(3) : a]
  for (let i = 0; i < 5; i++) seq.push(step(seq[i], i))
  return seq
}

/**
 * The answer and three near misses, all different and not negative.
 * @param {number} answer
 * @returns {number[]}
 */
export function choices(answer) {
  const set = new Set([answer])
  while (set.size < 4) {
    const c = answer + (rand(2) ? 1 : -1) * (1 + rand(Math.max(3, Math.round(answer * 0.2))))
    if (c >= 0) set.add(c)
  }
  return shuffle([...set])
}
