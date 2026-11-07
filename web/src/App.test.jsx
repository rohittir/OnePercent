// @ts-check
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from './App.jsx'
import { resetForTests } from './store.js'

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

test('ages up to 10 get Percy: a new player lands on today\'s four games', () => {
  makePlayer('Maya', 8)
  expect(document.body.dataset.theme).toBe('percy')
  expect(screen.getByText('Ready to grow, Maya?')).toBeTruthy()
  expect(document.querySelectorAll('.tile')).toHaveLength(4)
  expect(screen.getByRole('link', { name: 'Play ▶' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('Saving…') // online, not synced yet
})

test('ages over 10 get the galaxy: missions and planets', () => {
  makePlayer('Arjun', 12)
  expect(document.body.dataset.theme).toBe('galaxy')
  expect(screen.getByText('Mission 1')).toBeTruthy()
  expect(document.querySelectorAll('.planet')).toHaveLength(4)
})

test('play starts with the first game\'s intro; Who\'s playing lists every player', () => {
  makePlayer('Maya', 8)
  fireEvent.click(screen.getByRole('link', { name: 'Play ▶' }))
  expect(screen.getByRole('heading', { name: 'Echo' })).toBeTruthy()
  expect(screen.getByText('Game 1 of 4')).toBeTruthy()
  cleanup()
  open('/')
  expect(screen.getByRole('button', { name: /Maya/ })).toBeTruthy()
})

test('screens that need a player send you to "Who\'s playing?" without one', () => {
  open('/settings')
  expect(screen.getByRole('heading', { name: 'OnePercent' })).toBeTruthy() // no players: straight to New player
})
