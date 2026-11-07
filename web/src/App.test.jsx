// @ts-check
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from './App.jsx'
import { getState, resetForTests } from './store.js'

beforeEach(() => {
  resetForTests()
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/** @param {string} path */
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

/** @param {string} name @param {number} age */
function makePlayer(name, age) {
  open('/')
  fireEvent.change(screen.getByLabelText("What's your name?"), { target: { value: name } })
  fireEvent.click(screen.getByLabelText(String(age)))
  fireEvent.change(screen.getByLabelText(/Pick a 4-digit PIN/), { target: { value: '4821' } })
  fireEvent.click(screen.getByRole('button', { name: "Let's go!" }))
}

test('ages up to 10 get Percy: today\'s four games, each one a link to play it', () => {
  makePlayer('Maya', 8)
  expect(document.body.dataset.theme).toBe('percy')
  expect(screen.getByText('Ready to grow, Maya?')).toBeTruthy()
  const tiles = [...document.querySelectorAll('a.tile')]
  expect(tiles.map((t) => t.getAttribute('href'))).toEqual(['/play/echo', '/play/odd-one-out', '/play/whats-next', '/play/same-or-not'])
  expect(tiles[0].textContent).toContain('Level 5')
  expect(screen.getByRole('link', { name: 'Play ▶' }).getAttribute('href')).toBe('/play/echo')
  expect(screen.getByRole('status').textContent).toBe('Saving…') // online, not synced yet
})

test('ages over 10 get the galaxy: missions and planets', () => {
  makePlayer('Arjun', 12)
  expect(document.body.dataset.theme).toBe('galaxy')
  expect(screen.getByText('Mission 1')).toBeTruthy()
  expect(document.querySelectorAll('a.planet')).toHaveLength(4)
})

test('a game opens on its intro at the child\'s level, and ✕ goes home with no question', () => {
  makePlayer('Maya', 8)
  fireEvent.click(screen.getByRole('link', { name: 'Play ▶' }))
  expect(screen.getByRole('heading', { name: 'Echo' })).toBeTruthy()
  expect(screen.getByText('Working memory · Level 5')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Stop playing' }))
  expect(screen.getByText('Ready to grow, Maya?')).toBeTruthy()
})

test('deleting asks in the page, then the player leaves this device', () => {
  makePlayer('Maya', 8)
  cleanup()
  open('/settings')
  fireEvent.click(screen.getByRole('button', { name: 'Delete Maya' }))
  fireEvent.click(screen.getByRole('button', { name: 'Keep Maya' }))
  expect(getState().players).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Maya' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, delete Maya' }))
  expect(getState().players).toHaveLength(0)
  expect(screen.getByRole('heading', { name: 'OnePercent' })).toBeTruthy() // no players left: New player
})

test('screens that need a player send you to "Who\'s playing?" without one', () => {
  open('/settings')
  expect(screen.getByRole('heading', { name: 'OnePercent' })).toBeTruthy() // no players: straight to New player
})
