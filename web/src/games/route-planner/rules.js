// @ts-check
import { rand } from '../util.js'

/** @type {Record<string, [number, number]>} arrow → [row step, column step] */
export const MOVES = { '←': [0, -1], '↑': [-1, 0], '↓': [1, 0], '→': [0, 1] }

/**
 * The shortest route by breadth-first search.
 * @param {number} n the field is n × n
 * @param {Set<number>} rocks cells as row * n + column
 * @param {[number, number]} start
 * @param {[number, number]} goal
 * @returns {{ moves: string[], cells: [number, number][] } | null} null when there is no way through
 */
export function shortest(n, rocks, start, goal) {
  const key = (/** @type {number} */ r, /** @type {number} */ c) => r * n + c
  /** @type {Map<number, [number, number, string] | null>} */
  const prev = new Map([[key(...start), null]])
  const queue = [start]
  while (queue.length) {
    const [r, c] = /** @type {[number, number]} */ (queue.shift())
    if (r === goal[0] && c === goal[1]) break
    for (const [m, [dr, dc]] of Object.entries(MOVES)) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || rocks.has(key(nr, nc)) || prev.has(key(nr, nc))) continue
      prev.set(key(nr, nc), [r, c, m])
      queue.push([nr, nc])
    }
  }
  if (!prev.has(key(...goal))) return null
  /** @type {string[]} */
  const moves = []
  /** @type {[number, number][]} */
  const cells = []
  for (let cur = goal, step = prev.get(key(...cur)); step; cur = [step[0], step[1]], step = prev.get(key(...cur))) {
    moves.unshift(step[2])
    cells.unshift(cur)
  }
  return { moves, cells }
}

/**
 * A field worth planning: solvable, and longer than a straight line.
 * @param {{ size: number, rocks: number }} settings
 */
export function makeRoute({ size: n, rocks: count }) {
  for (;;) {
    /** @type {[number, number]} */
    const start = [n - 1, rand(2)]
    /** @type {[number, number]} */
    const goal = [rand(2), n - 1 - rand(2)]
    const rocks = new Set()
    while (rocks.size < count) {
      const k = rand(n * n)
      if (k !== start[0] * n + start[1] && k !== goal[0] * n + goal[1]) rocks.add(k)
    }
    const best = shortest(n, rocks, start, goal)
    if (best && best.moves.length >= n) return { n, rocks, start, goal, best }
  }
}
