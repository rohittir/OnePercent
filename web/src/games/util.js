// @ts-check
// Helpers a game may use. A game imports only from here, React, ../../sound.js and its own folder (CLAUDE.md, rule 5).
import { createElement, useCallback, useEffect, useRef } from 'react'

/** @param {number} n @returns {number} a whole number below n */
export const rand = (n) => Math.floor(Math.random() * n)
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
 * The bar that runs out; onTimeout fires once when it does, unless the round ended first (it unmounts).
 * @param {{ ms: number, onTimeout: () => void }} props
 */
export function TimerBar({ ms, onTimeout }) {
  const latest = useRef(onTimeout)
  latest.current = onTimeout
  useEffect(() => {
    const t = setTimeout(() => latest.current(), ms)
    return () => clearTimeout(t)
  }, [ms])
  return createElement('div', { className: 'timer', style: { animationDuration: `${ms}ms` } })
}
