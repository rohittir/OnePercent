// @ts-check
// Helpers a game may use. A game imports only from here, React, ../../sound.js and its own folder (CLAUDE.md, rule 5).
import { createContext, createElement, useCallback, useContext, useEffect, useRef } from 'react'

/** @param {number} n @returns {number} a whole number below n */
export const rand = (n) => Math.floor(Math.random() * n)
/** @template T @param {readonly T[]} items @returns {T} one of them */
export const pick = (items) => items[rand(items.length)]
/** @template T @param {T[]} items @returns {T[]} a shuffled copy */
export const shuffle = (items) => items.map((v) => /** @type {[number, T]} */ ([Math.random(), v])).sort((x, y) => x[0] - y[0]).map((v) => v[1])
/** 1% less time per level, never under `min`. @param {number} ms @param {number} level @param {number} min */
export const shrink = (ms, level, min) => Math.max(min, ms * 0.99 ** level)

/**
 * A random pair unlocked at this level (content type "pairs").
 * @param {{ a: string, b: string, level: number }[]} items
 * @param {number} level
 */
export function pairFor(items, level) {
  const open = items.filter((i) => i.level <= level)
  return (open.length ? open : items)[rand(open.length || items.length)]
}

/** @returns {(fn: () => void, ms: number) => void} setTimeout that is cleared when the component unmounts */
export function useLater() {
  const ids = useRef(/** @type {ReturnType<typeof setTimeout>[]} */ ([]))
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return useCallback((fn, ms) => {
    ids.current.push(setTimeout(fn, ms))
  }, [])
}

/**
 * What the round's card is doing, set by the game screen: `answered` once the round is answered (the timer stops where it is),
 * and `settleMs`, how long the card takes to slide in (the timer starts after it). Without a provider (tests), neither applies.
 */
export const RoundContext = createContext({ answered: false, settleMs: 0 })

/**
 * The bar that runs out; onTimeout fires once when it does, unless the round was answered first or ended.
 * @param {{ ms: number, onTimeout: () => void }} props
 */
export function TimerBar({ ms, onTimeout }) {
  const { answered, settleMs } = useContext(RoundContext)
  const latest = useRef(onTimeout)
  latest.current = onTimeout
  useEffect(() => {
    if (answered) return
    const t = setTimeout(() => latest.current(), ms + settleMs)
    return () => clearTimeout(t)
  }, [ms, settleMs, answered])
  return createElement('div', {
    className: 'timer',
    style: { animationDuration: `${ms}ms`, animationDelay: `${settleMs}ms`, animationPlayState: answered ? 'paused' : 'running' },
  })
}

/**
 * The class of an answer option once the round is answered: the pick gets ✓ or ✗; after a miss or a timeout the right one is shown.
 * @param {unknown} option
 * @param {unknown} pick null until answered; 'timeout' when the bar ran out
 * @param {unknown} right the right option
 */
export function mark(option, pick, right) {
  if (pick === null) return ''
  if (option === pick) return option === right ? ' picked-right' : ' picked-wrong'
  return option === right && pick !== right ? ' reveal' : ''
}

// Shapes for the games that sort or match them.
export const SHAPES = ['circle', 'square', 'triangle']
export const COLOURS = { red: '#ef4444', blue: '#3b82f6', yellow: '#f59e0b' }
/** @param {{ shape: string, colour: string, size: number }} props */
export const Shape = ({ shape, colour, size }) =>
  createElement('i', { className: `shape ${shape}`, style: { width: size, height: size, background: COLOURS[/** @type {keyof typeof COLOURS} */ (colour)] }, 'aria-hidden': true })

/**
 * Marks the next right move, which Percy's ghost hand taps in "Watch me first" (screens/Session.jsx) and the end-to-end tests
 * follow. Spread it on the element: {...demoNext(isNext)}.
 * @param {boolean} isNext
 */
export const demoNext = (isNext) => (isNext ? { 'data-demo-next': '' } : {})
