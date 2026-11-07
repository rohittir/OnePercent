// @ts-check
// The game registry. To add a game: make web/src/games/<id>/index.jsx with the fields below, then list it here.
// The app shell, sync, themes and the day flow don't change (docs/ARCHITECTURE.md, "A game").
import echo from './echo/index.jsx'
import oddOneOut from './odd-one-out/index.jsx'
import sameOrNot from './same-or-not/index.jsx'
import whatsNext from './whats-next/index.jsx'

/**
 * @typedef {{
 *   id: string, name: string, icon: string, how: string,
 *   skill: 'memory' | 'focus' | 'logic' | 'speed', ages: [number, number], rounds: number,
 *   color: string[], content?: string,
 *   settings: (level: number) => any,
 *   Round: (props: { settings: any, content: any, say: (text: string) => void, onDone: (ok: boolean) => void }) => any,
 * }} Game
 */

/** @type {Game[]} */
export const GAMES = /** @type {Game[]} */ ([echo, oddOneOut, whatsNext, sameOrNot])

export const SKILL_NAMES = { memory: 'Working memory', focus: 'Attention', logic: 'Pattern & logic', speed: 'Processing speed' }
