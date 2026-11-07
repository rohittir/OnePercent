// @ts-check
import { devices, expect } from '@playwright/test'

export const phone = devices['Pixel 7']

/** @param {import('@playwright/test').Page} page @param {{ name: string, age: number, pin?: string }} who */
export async function newPlayer(page, { name, age, pin = '4821' }) {
  await page.goto('/new')
  await page.getByLabel("What's your name?").fill(name)
  await page.locator('.age', { hasText: new RegExp(`^${age}$`) }).click()
  await page.getByLabel(/Pick a 4-digit PIN/).fill(pin)
  await page.getByRole('button', { name: "Let's go!" }).click()
  await expect(page.locator('#play')).toBeVisible()
}

/** @param {import('@playwright/test').Page} page waits until the player's progress is on the server */
export const saved = (page) => expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 20_000 })

/**
 * Pins the page's date to 2026-11-19, the day a new player's daily mix is the first four games (shared/today.js), so journeys
 * see the same games every day they run. Timers run as usual.
 * @param {import('@playwright/test').Page} page
 */
export const fixDay = (page) => page.clock.setFixedTime(new Date('2026-11-19T10:00:00'))

/** @param {import('@playwright/test').Browser} browser a phone with the fixed day */
export async function phonePage(browser) {
  const page = await (await browser.newContext(phone)).newPage()
  await fixDay(page)
  return page
}

/**
 * Plays one game from its intro to its result screen by following the move each round marks as next (data-demo-next, the same
 * marks Percy's ghost hand follows in "Watch me first"). Runs in the page.
 * @param {{ misses?: number, watch?: boolean }} options misses: answer this many rounds wrong first; watch: sit through the demo
 * @returns {Promise<number>} the rounds answered
 */
export async function autoplay({ misses = 0, watch = false } = {}) {
  const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms))
  let answered = 0
  /** @type {Element | null} */
  let handled = null
  for (let step = 0; step < 5000; step++) {
    await wait(100)
    if (document.querySelector('.result')) return answered
    const go = document.getElementById('go')
    const skip = document.getElementById('demo')
    if (go && document.querySelector('.intro')) {
      ;(!watch && skip?.textContent === 'Skip the demo' ? skip : go).click()
      continue
    }
    const area = document.getElementById('area')
    const card = area?.firstElementChild
    if (!area || !card || card.classList.contains('demo') || area.classList.contains('right') || area.classList.contains('wrong')) continue
    const next = /** @type {HTMLElement | null} */ (card.querySelector('[data-demo-next]:not(:disabled)'))
    if (!next) continue
    if (answered < misses) {
      if (card === handled) continue
      const wrong = /** @type {HTMLElement | undefined} */ ([...card.querySelectorAll('button:not(:disabled)')].find((b) => b !== next && !b.closest('.pad')))
      wrong?.click()
    } else {
      next.click()
    }
    if (card !== handled) answered++
    handled = card
  }
  throw new Error('autoplay ran out of time')
}
