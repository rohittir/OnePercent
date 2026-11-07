// @ts-check
// One theme per age band (shared/bands.js). A new band: an entry there, and a folder here with index.jsx and theme.css.
import { useEffect } from 'react'
import { bandFor } from '@onepercent/shared/bands.js'
import galaxy from './galaxy/index.jsx'
import percy from './percy/index.jsx'

/**
 * @typedef {ReturnType<typeof import('@onepercent/shared/progress.js').progress>} Progress
 * @typedef {{ game: import('../games/index.js').Game, status: any, to: string }} GameStatus
 * @typedef {{
 *   id: string,
 *   words: { start: string, again: string, grew: string, allDone: string, good: string[], bad: string[] },
 *   stat: (prog: Progress) => string,
 *   Face: () => any,
 *   Coach: ((props: { grown: number, mood: 'right' | 'wrong' | null }) => any) | null,
 *   Cheer: (props: { grown: number, ok: boolean }) => any,
 *   HomeHero: (props: { name: string, prog: Progress, day: number, done: boolean, count: number }) => any,
 *   HomeGames: (props: { games: GameStatus[], day: number, done: boolean }) => any,
 * }} Theme
 *   done: every game of today's set has been passed today
 */

/** @type {Record<string, Theme>} */
export const THEMES = { percy, galaxy }

/** @param {number | undefined} age @returns {Theme} */
export const themeFor = (age) => THEMES[(age && bandFor(age)?.id) || 'percy']

/** Sets the page's theme while the component shows. @param {number | undefined} age @returns {Theme} */
export function useTheme(age) {
  const theme = themeFor(age)
  useEffect(() => {
    document.body.dataset.theme = theme.id
  }, [theme.id])
  return theme
}
