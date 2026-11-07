// @ts-check
// The game registry. To add a game: make web/src/games/<id>/index.jsx with the fields below, then list it here.
// The app shell, sync, themes and the day flow don't change (docs/ARCHITECTURE.md, "A game").
import { levelsOf } from '@onepercent/shared/progress.js'
import { pickToday } from '@onepercent/shared/today.js'
import echo from './echo/index.jsx'
import fireflyCatch from './firefly-catch/index.jsx'
import oddOneOut from './odd-one-out/index.jsx'
import patternGrid from './pattern-grid/index.jsx'
import routePlanner from './route-planner/index.jsx'
import sameOrNot from './same-or-not/index.jsx'
import sortSwitch from './sort-switch/index.jsx'
import whatsNext from './whats-next/index.jsx'

/**
 * @typedef {{
 *   id: string, name: string, icon: string, how: string,
 *   skill: 'memory' | 'focus' | 'logic' | 'speed' | 'switch' | 'stop' | 'plan', ages: [number, number], rounds: number,
 *   color: string[], content?: string,
 *   settings: (level: number) => any,
 *   Round: (props: { settings: any, content: any, say: (text: string) => void, onDone: (ok: boolean | number) => void, round: number, demo: boolean }) => any,
 * }} Game
 *   Round: draws one round. onDone(true/false), or a score from 0 to 1 for a round of many taps (Firefly Catch's wave), once.
 *   It marks its next right move with demoNext() (util.js), which "Watch me first" follows. `round` counts from 1; `demo` is the demo round.
 */

/** @type {Game[]} */
export const GAMES = /** @type {Game[]} */ ([echo, oddOneOut, whatsNext, sameOrNot, sortSwitch, fireflyCatch, routePlanner, patternGrid])

export const SKILL_NAMES = {
  memory: 'Working memory', focus: 'Attention', logic: 'Pattern & logic', speed: 'Processing speed',
  switch: 'Switching rules', stop: 'Self-control', plan: 'Planning',
}

/**
 * Today's games for a player: the daily mix of shared/today.js, from the levels the day began with, so it holds still while they play.
 * @param {{ age: number, startLevels: Record<string, number>, days: import('@onepercent/shared/merge.js').Days }} player
 * @param {string} date
 */
export const gamesToday = (player, date) =>
  pickToday(GAMES, { age: player.age, date, levels: levelsOf(player.startLevels, player.days, date), startLevels: player.startLevels })
