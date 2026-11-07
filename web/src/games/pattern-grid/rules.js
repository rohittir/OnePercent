// @ts-check
import { COLOURS, pick, SHAPES, shuffle } from '../util.js'

/** The things a tile has, each with three values. */
export const ATTRS = { shape: SHAPES, colour: Object.keys(COLOURS), count: [1, 2, 3] }

/**
 * A 3×3 grid in which `rules` of the tile's attributes follow a rule (one value per row, per column, or once in every row and column),
 * the rest stay the same; the bottom-right tile is missing. Wrong options differ from the answer in one attribute.
 * @param {{ rules: number, latin: boolean, options: number }} settings
 */
export function makePattern({ rules: count, latin, options: size }) {
  const names = /** @type {(keyof typeof ATTRS)[]} */ (Object.keys(ATTRS))
  const varying = shuffle(names).slice(0, count)
  /** @type {Record<string, { kind: string, at: (r: number, c: number) => any }>} */
  const rules = {}
  for (const a of names) {
    const perm = shuffle([...ATTRS[a]])
    const kind = varying.includes(a) ? pick(latin ? ['row', 'col', 'latin'] : ['row', 'col']) : 'same'
    rules[a] = { kind, at: (r, c) => perm[kind === 'row' ? r : kind === 'col' ? c : kind === 'latin' ? (r + c) % 3 : 0] }
  }
  /** @returns {{ shape: string, colour: string, count: number }} */
  const cell = (/** @type {number} */ r, /** @type {number} */ c) => /** @type {any} */ (Object.fromEntries(names.map((a) => [a, rules[a].at(r, c)])))
  const answer = cell(2, 2)
  const seen = new Set([JSON.stringify(answer)])
  const options = [answer]
  for (let tries = 0; options.length < size && tries < 200; tries++) {
    const a = tries < 100 ? pick(varying) : pick(names)
    const other = { ...answer, [a]: pick(/** @type {any[]} */ (ATTRS[a]).filter((v) => v !== answer[a])) }
    if (!seen.has(JSON.stringify(other))) {
      seen.add(JSON.stringify(other))
      options.push(other)
    }
  }
  const words = { row: (/** @type {string} */ a) => `each row keeps one ${a}`, col: (/** @type {string} */ a) => `each column keeps one ${a}`,
    latin: (/** @type {string} */ a) => `every ${a} appears once in each row and column` }
  const why = varying.map((a) => words[/** @type {'row' | 'col' | 'latin'} */ (rules[a].kind)](a)).join('; ')
  return { cell, answer, options: shuffle(options), why: `${why[0].toUpperCase()}${why.slice(1)}.` }
}
