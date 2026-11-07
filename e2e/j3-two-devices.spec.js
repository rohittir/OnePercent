// @ts-check
// J3: two devices of one player play the same game on the same day while offline; once online, both end up with the best
// of each (shared/merge.js). Any device can replay any game at any time.
import { expect, test } from '@playwright/test'
import { autoplay, newPlayer, phonePage, saved } from './helpers.js'

/** @param {import('@playwright/test').Page} page plays today's first game, Echo, then goes home @param {number} misses */
async function playEcho(page, misses) {
  await page.locator('#play').click()
  await page.evaluate(autoplay, { misses })
  await expect(page.getByRole('heading', { name: 'Level 6 unlocked!' })).toBeVisible()
  await page.locator('#home').click()
}

test('J3: two devices play the same game offline and converge on the best result', async ({ browser }) => {
  const a = await phonePage(browser)
  await newPlayer(a, { name: 'Maya', age: 8, pin: '1357' })
  await saved(a)
  await a.goto('/move')
  const code = (await a.getByLabel('Your ID').textContent())?.trim() ?? ''
  await a.goto('/play')

  const b = await phonePage(browser)
  await b.goto(`/join#${code}.1357`)
  await expect(b.getByText('Ready to grow, Maya?')).toBeVisible()

  const echoStars = (/** @type {import('@playwright/test').Page} */ page) => page.locator('.tile', { hasText: 'Echo' }).getByRole('img')

  // Both offline: A misses one round of Echo (4 of 5: a pass, two stars), B gets all five (three stars).
  await a.context().setOffline(true)
  await b.context().setOffline(true)
  await playEcho(a, 1)
  await expect(echoStars(a)).toHaveAccessibleName('2 of 3 stars')
  await playEcho(b, 0)
  await expect(echoStars(b)).toHaveAccessibleName('3 of 3 stars')

  // Back online, B first, then A: A's sync brings back B's better result.
  await b.context().setOffline(false)
  await saved(b)
  await a.context().setOffline(false)
  await saved(a)
  await expect(echoStars(a)).toHaveAccessibleName('3 of 3 stars')
  await expect(a.getByText('⭐ 3')).toBeVisible()
  await expect(a.locator('.tile', { hasText: 'Echo' })).toContainText('Level 6')

  // And B keeps it: its own copy and the server's agree.
  await b.reload()
  await saved(b)
  await expect(echoStars(b)).toHaveAccessibleName('3 of 3 stars')
})
