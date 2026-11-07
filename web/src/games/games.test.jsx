// @ts-check
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import starter from '../../../content/pairs/starter.json'
import { SKILLS } from '@onepercent/shared/levels.js'
import { GAMES } from './index.js'
import { makePattern } from './pattern-grid/rules.js'
import { makeRoute, shortest } from './route-planner/rules.js'
import { choices, makeSequence } from './whats-next/rules.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const game = (/** @type {string} */ id) => /** @type {import('./index.js').Game} */ (GAMES.find((g) => g.id === id))
/** @param {string} id @param {number} [level] @param {{ round?: number, demo?: boolean, settings?: any }} [extra] */
function play(id, level = 0, { round = 1, demo = false, settings } = {}) {
  const g = game(id)
  const onDone = vi.fn()
  const say = vi.fn()
  const { container } = render(<g.Round settings={settings ?? g.settings(level)} content={starter.items} say={say} onDone={onDone} round={round} demo={demo} />)
  const next = () => /** @type {HTMLElement} */ (container.querySelector('[data-demo-next]'))
  return { container, onDone, say, next, cells: () => [...container.querySelectorAll('.cell')] }
}

test('every game in the registry has the contract the app needs', () => {
  for (const g of GAMES) {
    expect(g.id).toMatch(/^[a-z0-9-]+$/)
    expect(SKILLS).toContain(g.skill)
    expect(g.ages[0]).toBeLessThanOrEqual(g.ages[1])
    expect(g.rounds).toBeGreaterThan(0)
    expect(typeof g.settings(0)).toBe('object')
  }
  expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length)
})

/** Steps through Echo's flashes and returns the order it showed. @param {() => Element[]} cells */
function watch(cells) {
  const seen = []
  let last = -1
  for (let t = 0; t < 8000 && cells().some((c) => /** @type {HTMLButtonElement} */ (c).disabled); t += 50) {
    act(() => { vi.advanceTimersByTime(50) })
    const lit = cells().findIndex((c) => c.classList.contains('lit'))
    if (lit >= 0 && lit !== last) seen.push(lit)
    last = lit
  }
  return seen
}

test('echo: tapping the shown order back is right; a wrong tile is wrong and the due tile is shown', () => {
  const { onDone, say, cells } = play('echo', 0)
  const seen = watch(cells)
  expect(seen).toHaveLength(3) // level 0: three tiles
  expect(say).toHaveBeenLastCalledWith('Your turn! Tap them in order')
  seen.forEach((i) => fireEvent.click(cells()[i]))
  expect(onDone).toHaveBeenCalledExactlyOnceWith(true)
  expect(cells()[seen[2]].classList.contains('picked-right')).toBe(true)

  cleanup()
  const second = play('echo', 0)
  const order = watch(second.cells)
  const wrong = (order[0] + 1) % 9
  fireEvent.click(second.cells()[wrong])
  fireEvent.click(second.cells()[order[0]]) // too late: the round is answered
  expect(second.onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(second.cells()[wrong].classList.contains('picked-wrong')).toBe(true)
  expect(second.cells()[order[0]].classList.contains('reveal')).toBe(true)
  expect(second.container.querySelector('.why')?.textContent).toBe('This one was next.')
})

test('odd one out: the different cell is right; a miss shows it; the bar running out is wrong', () => {
  const { container, onDone, cells } = play('odd-one-out', 0)
  const counts = new Map()
  cells().forEach((c) => counts.set(c.textContent, (counts.get(c.textContent) ?? 0) + 1))
  expect(cells()).toHaveLength(9)
  const odd = /** @type {Element} */ (cells().find((c) => counts.get(c.textContent) === 1))
  const plain = /** @type {Element} */ (cells().find((c) => counts.get(c.textContent) > 1))
  fireEvent.click(plain)
  fireEvent.click(odd) // a second tap changes nothing
  expect(onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(odd.classList.contains('reveal')).toBe(true)
  expect(container.querySelector('.why')?.textContent).toBe(`The odd one was ${odd.textContent}.`)
  act(() => { vi.advanceTimersByTime(10_000) })
  expect(onDone).toHaveBeenCalledTimes(1) // answered: the bar no longer counts

  cleanup()
  const slow = play('odd-one-out', 0)
  act(() => { vi.advanceTimersByTime(10_000) })
  expect(slow.onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(slow.container.querySelectorAll('.reveal')).toHaveLength(1)
})

test("what's next: one tap answers; the ? fills with the answer, and a miss shows the right choice", () => {
  const { container, onDone } = play('whats-next', 30)
  const buttons = [...container.querySelectorAll('.choices button')]
  expect(buttons).toHaveLength(4)
  buttons.forEach((b) => fireEvent.click(b))
  expect(onDone).toHaveBeenCalledTimes(1)
  const answer = container.querySelector('.chip.q')?.textContent
  const right = buttons.find((b) => b.textContent === answer)
  expect(right?.className).toMatch(onDone.mock.calls[0][0] ? /picked-right/ : /reveal/)
})

test('same or not: the honest answer is right', () => {
  const { container, onDone } = play('same-or-not', 50)
  const [a, b] = [...container.querySelectorAll('.pair span')].map((s) => s.textContent)
  fireEvent.click(/** @type {Element} */ (container.querySelector(a === b ? '.yes' : '.nope')))
  expect(onDone).toHaveBeenCalledWith(true)
  expect(container.querySelector('.picked-right')).toBeTruthy()
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

test('every game marks its next right move, and following the marks wins the round', () => {
  for (const g of GAMES.filter((x) => x.id !== 'firefly-catch')) {
    const { onDone, next } = play(g.id, 10)
    for (let step = 0; step < 40 && !onDone.mock.calls.length; step++) {
      act(() => { vi.advanceTimersByTime(400) })
      if (next()) fireEvent.click(next())
    }
    expect(onDone, g.id).toHaveBeenCalledExactlyOnceWith(true)
    cleanup()
  }
})

test('sort switch: the rule switches every 3 cards at level 10, with a flash on the switch', () => {
  const settings = game('sort-switch').settings(10)
  const rules = [1, 2, 3, 4].map((round) => {
    const { container } = play('sort-switch', 10, { round, settings })
    const text = container.querySelector('.rule')?.textContent ?? ''
    cleanup()
    return text
  })
  expect(rules).toEqual(['🎨 Colour', '🎨 Colour', '🎨 Colour', '🔄 Switch! 🔷 Shape'])
  const { container, onDone, next } = play('sort-switch', 10)
  const wrong = /** @type {HTMLElement} */ ([...container.querySelectorAll('.basket')].find((b) => b !== next()))
  const right = next()
  fireEvent.click(wrong)
  expect(onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(right.classList.contains('reveal')).toBe(true)
  expect(container.querySelector('.why')?.textContent).toMatch(/^Colour rule: \w+ goes with \w+\.$/)
})

test('firefly catch: a wave scores the share of right calls — ladybugs tapped, bees left alone', () => {
  const settings = { life: 1000, gap: 500, bees: 0.3, beetles: false }
  const { container, onDone } = play('firefly-catch', 0, { settings })
  for (let t = 0; t < 12_000 && !onDone.mock.calls.length; t += 100) {
    act(() => { vi.advanceTimersByTime(100) })
    const bug = /** @type {HTMLElement | null} */ (container.querySelector('[data-demo-next]'))
    if (bug) fireEvent.click(bug)
  }
  expect(onDone).toHaveBeenCalledExactlyOnceWith(1)
  expect(container.querySelector('.why')?.textContent).toBe('10 of 10 right.')

  cleanup()
  const tapAll = play('firefly-catch', 0, { settings })
  for (let t = 0; t < 12_000 && !tapAll.onDone.mock.calls.length; t += 100) {
    act(() => { vi.advanceTimersByTime(100) })
    tapAll.container.querySelectorAll('.bug:not(:disabled)').forEach((b) => fireEvent.click(b)) // taps the bees too
  }
  const score = tapAll.onDone.mock.calls[0][0]
  expect(score).toBeGreaterThan(0)
  expect(score).toBeLessThan(1)
})

test('route planner: puzzles are solvable and need planning; a bump shows the shortest route', () => {
  for (let i = 0; i < 100; i++) {
    const p = makeRoute({ size: 6, rocks: 9 })
    expect(p.best.moves.length).toBeGreaterThanOrEqual(6)
    expect(shortest(p.n, p.rocks, p.start, p.goal)?.moves.length).toBe(p.best.moves.length)
  }
  expect(shortest(2, new Set([1, 2]), [1, 0], [0, 1])).toBeNull()
  const { container, onDone } = play('route-planner', 0)
  const away = container.querySelector('[aria-label="move ↓"]') // the start is on the bottom row: down walks off the edge
  fireEvent.click(/** @type {Element} */ (away))
  fireEvent.click(/** @type {Element} */ (container.querySelector('.go')))
  act(() => { vi.advanceTimersByTime(1000) })
  expect(onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(container.querySelector('.why')?.textContent).toMatch(/^Bonk! That is the edge\. A \d+-move route/)
  expect(container.querySelectorAll('.sq.short').length).toBeGreaterThan(0)
})

test('pattern grid: one answer among different choices, and a miss names the rule', () => {
  for (let i = 0; i < 200; i++) {
    const p = makePattern({ rules: 3, latin: true, options: 6 })
    expect(p.options).toHaveLength(6)
    expect(new Set(p.options.map((o) => JSON.stringify(o))).size).toBe(6)
    expect(p.options).toContain(p.answer)
  }
  const { container, onDone, next } = play('pattern-grid', 0)
  fireEvent.click(/** @type {Element} */ ([...container.querySelectorAll('.opts button')].find((b) => b !== next())))
  expect(onDone).toHaveBeenCalledExactlyOnceWith(false)
  expect(container.querySelector('.why')?.textContent).toMatch(/keeps one|appears once/)
  expect(container.querySelector('.gap.filled')).toBeTruthy()
})
