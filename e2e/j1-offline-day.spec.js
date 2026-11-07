// @ts-check
// J1: with no backend at all, a child misses, retries, passes at 80%+, moves up a level at once, and plays the rest of today's games.
import { expect, test } from '@playwright/test'
import { autoplay, newPlayer } from './helpers.js'

test('J1: retries are unlimited, a pass unlocks the next level at once, all with no backend', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort())
  await newPlayer(page, { name: 'Maya', age: 8 })
  const echoTile = page.locator('a.tile', { hasText: 'Echo' })
  await expect(echoTile).toContainText('Level 5')

  // Two rounds wrong: 60%, not a pass. Try again at the same level.
  await page.locator('#play').click()
  await page.evaluate(autoplay, { misses: 2 })
  await expect(page.getByRole('heading', { name: 'So close!' })).toBeVisible()
  await page.locator('#again').click()
  await expect(page.getByText('Working memory · Level 5')).toBeVisible()

  // A pass: the next level at once, no waiting for tomorrow.
  await page.evaluate(autoplay, {})
  await expect(page.getByRole('heading', { name: 'Level 6 unlocked!' })).toBeVisible()
  await page.locator('#again').click()
  await expect(page.getByText('Working memory · Level 6')).toBeVisible()
  await page.getByRole('button', { name: 'Stop playing' }).click()
  await expect(echoTile).toContainText('Level 6')

  // The rest of today's games, one after the other.
  await page.locator('#play').click()
  for (const name of ['Odd One Out', "What's Next?", 'Same or Not?']) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await page.evaluate(autoplay, {})
    await expect(page.getByRole('heading', { name: 'Level 6 unlocked!' })).toBeVisible()
    if (name !== 'Same or Not?') await page.locator('#next-game').click()
  }
  await expect(page.locator('#next-game')).toHaveCount(0) // every game of today's set is passed
  await page.locator('#home').click()

  await expect(page.getByText(/All passed today/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play again ▶' })).toBeVisible()
  await expect(page.getByLabel('1 day streak')).toBeVisible()
  await expect(page.getByText('⭐ 12')).toBeVisible() // the best of each game today: three stars each
  await expect(page.getByRole('status')).not.toHaveText('Saved ✓') // nothing reached a server
})
