// @ts-check
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import starter from '../../../content/pairs/starter.json'
import { GAMES } from './index.js'
import { choices, makeSequence } from './whats-next/rules.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const game = (/** @type {string} */ id) => /** @type {import('./index.js').Game} */ (GAMES.find((g) => g.id === id))
/** @param {string} id @param {number} [level] */
function play(id, level = 0) {
  const g = game(id)
  const onDone = vi.fn()
  const say = vi.fn()
  const { container } = render(<g.Round settings={g.settings(level)} content={starter.items} say={say} onDone={onDone} />)
  return { container, onDone, say, cells: () => [...container.querySelectorAll('.cell')] }
}

test('every game in the registry has the contract the app needs', () => {
  for (const g of GAMES) {
    expect(g.id).toMatch(/^[a-z0-9-]+$/)
    expect(['memory', 'focus', 'logic', 'speed']).toContain(g.skill)
    expect(g.ages[0]).toBeLessThanOrEqual(g.ages[1])
    expect(g.rounds).toBeGreaterThan(0)
    expect(typeof g.settings(0)).toBe('object')
  }
  expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length)
})

test('echo: tapping the shown order back is right; a wrong tile is wrong', () => {
  const { onDone, say, cells } = play('echo', 0)
  const seen = []
  let last = -1
  for (let t = 0; t < 8000 && cells().some((c) => /** @type {HTMLButtonElement} */ (c).disabled); t += 50) {
    act(() => { vi.advanceTimersByTime(50) })
    const lit = cells().findIndex((c) => c.classList.contains('lit'))
    if (lit >= 0 && lit !== last) seen.push(lit)
    last = lit
  }
  expect(seen).toHaveLength(3) // level 0: three tiles
  expect(say).toHaveBeenLastCalledWith('Your turn! Tap them in order')
  seen.forEach((i) => fireEvent.click(cells()[i]))
  expect(onDone).toHaveBeenCalledExactlyOnceWith(true)

  const second = play('echo', 0)
  act(() => { vi.advanceTimersByTime(8000) })
  fireEvent.click(second.cells()[0])
  fireEvent.click(second.cells()[1])
  fireEvent.click(second.cells()[2])
  fireEvent.click(second.cells()[3]) // four taps for three tiles: one of them is wrong
  expect(second.onDone.mock.calls.flat()).toContain(false)
})

test('odd one out: the different cell is right; the bar running out is wrong', () => {
  const { onDone, cells } = play('odd-one-out', 0)
  const counts = new Map()
  cells().forEach((c) => counts.set(c.textContent, (counts.get(c.textContent) ?? 0) + 1))
  expect(cells()).toHaveLength(9)
  fireEvent.click(/** @type {Element} */ (cells().find((c) => counts.get(c.textContent) === 1)))
  expect(onDone).toHaveBeenCalledWith(true)

  const slow = play('odd-one-out', 0)
  act(() => { vi.advanceTimersByTime(10_000) })
  expect(slow.onDone).toHaveBeenCalledExactlyOnceWith(false)
})

test("what's next: exactly one choice is right", () => {
  const { container, onDone } = play('whats-next', 30)
  const buttons = [...container.querySelectorAll('.choices button')]
  expect(buttons).toHaveLength(4)
  buttons.forEach((b) => fireEvent.click(b))
  expect(onDone.mock.calls.flat().filter(Boolean)).toHaveLength(1)
})

test('same or not: the honest answer is right', () => {
  const { container, onDone } = play('same-or-not', 50)
  const [a, b] = [...container.querySelectorAll('.pair span')].map((s) => s.textContent)
  fireEvent.click(/** @type {Element} */ (container.querySelector(a === b ? '.yes' : '.nope')))
  expect(onDone).toHaveBeenCalledWith(true)
})

test("what's next rules: six whole numbers, never negative; four different choices with the answer", () => {
  vi.useRealTimers()
  for (let level = 0; level <= 200; level += 5) {
    for (let i = 0; i < 40; i++) {
      const seq = makeSequence(level)
      expect(seq).toHaveLength(6)
      expect(seq.every((x) => Number.isInteger(x) && x >= 0)).toBe(true)
      const c = choices(/** @type {number} */ (seq.at(-1)))
      expect(new Set(c).size).toBe(4)
      expect(c).toContain(seq.at(-1))
      expect(c.every((x) => x >= 0)).toBe(true)
    }
  }
})
