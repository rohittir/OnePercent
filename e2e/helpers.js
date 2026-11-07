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
 * Plays one game from its intro, reading each answer off the screen like a careful child, and stops at its result screen.
 * Runs in the page.
 * @param {{ misses?: number }} options answer this many rounds wrong first
 * @returns {Promise<number>} the rounds answered
 */
export async function autoplay({ misses = 0 } = {}) {
  const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms))
  /** @type {number[]} Echo's flashes, recorded as they light disabled tiles */
  const seen = []
  const observer = new MutationObserver((mutations) => {
    for (const { target } of mutations) {
      const el = /** @type {HTMLButtonElement} */ (target)
      if (el.disabled && el.classList.contains('lit')) seen.push([...(el.parentNode?.children ?? [])].indexOf(el))
    }
  })
  observer.observe(/** @type {Node} */ (document.querySelector('main')), { subtree: true, attributes: true, attributeFilter: ['class'] })
  let answered = 0
  /** @type {Element | null} */
  let handled = null
  try {
    for (let step = 0; step < 5000; step++) {
      await wait(100)
      if (document.querySelector('.result')) return answered
      const go = document.getElementById('go')
      if (go && document.querySelector('.intro')) {
        go.click()
        continue
      }
      const area = document.getElementById('area')
      const round = area?.firstElementChild ?? null
      if (!area || !round || round === handled || area.classList.contains('right') || area.classList.contains('wrong')) continue
      const say = document.getElementById('say')?.textContent ?? ''
      const wrong = answered < misses
      /** @param {string} selector */
      const all = (selector) => /** @type {HTMLElement[]} */ ([...area.querySelectorAll(selector)])
      if (say.startsWith('Your turn')) {
        const tiles = all('.cell')
        const order = seen.splice(0)
        if (wrong) tiles[(order[0] + 1) % tiles.length].click()
        else order.forEach((i) => tiles[i].click())
      } else if (say.startsWith('Find the odd')) {
        const cells = all('.cell')
        const count = (/** @type {HTMLElement} */ c) => cells.filter((x) => x.textContent === c.textContent).length
        const pick = /** @type {HTMLElement} */ (cells.find((c) => (count(c) === 1) !== wrong))
        pick.click()
      } else if (say.startsWith('What comes next')) {
        const s = all('.chip:not(.q)').map((c) => Number(c.textContent))
        const d1 = s[1] - s[0]
        const ratio = s[1] / s[0]
        const answer = s.slice(1).every((x, i) => x - s[i] === d1) ? s[4] + d1
          : s.slice(1).every((x, i) => x / s[i] === ratio) ? s[4] * ratio
            : s[4] + (s[4] - s[3]) + (s[2] - s[1] - d1)
        const pick = /** @type {HTMLElement} */ (all('.choices button').find((b) => (Number(b.textContent) === answer) !== wrong))
        pick.click()
      } else if (say.startsWith('Same or not')) {
        const [a, b] = all('.pair span').map((x) => x.textContent)
        all('.yn button')[(a === b) !== wrong ? 0 : 1].click()
      } else {
        continue // Echo is still showing its flashes
      }
      answered++
      handled = round
    }
    throw new Error('autoplay ran out of time')
  } finally {
    observer.disconnect()
  }
}
