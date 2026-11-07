// @ts-check
// J3: two devices of one player play the same game on the same day before either syncs (say, both offline);
// once online, both end up with the best result. (A game already synced from one device counts as played on the other.)
import { expect, test } from '@playwright/test'
import { autoplay, newPlayer, phone, saved } from './helpers.js'

/** @param {import('@playwright/test').Page} page plays today's first game, then stops for now @param {boolean} missFirst */
async function playEcho(page, missFirst) {
  await page.locator('#play').click()
  await page.evaluate(autoplay, { games: 1, missFirst })
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Stop playing' }).click()
}

test('J3: two devices play the same game offline and converge on the best result', async ({ browser }) => {
  const a = await (await browser.newContext(phone)).newPage()
  await newPlayer(a, { name: 'Maya', age: 8, pin: '1357' })
  await saved(a)
  await a.goto('/move')
  const code = (await a.getByLabel('Your ID').textContent())?.trim() ?? ''
  await a.goto('/play')

  const b = await (await browser.newContext(phone)).newPage()
  await b.goto(`/join#${code}.1357`)
  await expect(b.getByText('Ready to grow, Maya?')).toBeVisible()

  const echoStars = (/** @type {import('@playwright/test').Page} */ page) => page.locator('.tile', { hasText: 'Echo' }).getByRole('img')

  // Both offline: A misses one round of Echo (4 of 5: two stars), B gets all five (three stars).
  await a.context().setOffline(true)
  await b.context().setOffline(true)
  await playEcho(a, true)
  await expect(echoStars(a)).toHaveAccessibleName('2 of 3 stars')
  await playEcho(b, false)
  await expect(echoStars(b)).toHaveAccessibleName('3 of 3 stars')

  // Back online, B first, then A: A's sync brings back B's better result.
  await b.context().setOffline(false)
  await saved(b)
  await a.context().setOffline(false)
  await saved(a)
  await expect(echoStars(a)).toHaveAccessibleName('3 of 3 stars')
  await expect(a.getByText('⭐ 3')).toBeVisible()

  // And B keeps it: its own copy and the server's agree.
  await b.reload()
  await saved(b)
  await expect(echoStars(b)).toHaveAccessibleName('3 of 3 stars')
})
