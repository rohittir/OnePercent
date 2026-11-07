// @ts-check
// J1: a new player plays a whole day with no backend at all.
import { expect, test } from '@playwright/test'
import { autoplay, newPlayer } from './helpers.js'

test('J1: a new player plays a day with no backend', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort())
  await newPlayer(page, { name: 'Maya', age: 8 })
  await expect(page.getByText('Ready to grow, Maya?')).toBeVisible()
  await expect(page.locator('.tile')).toHaveCount(4)

  await page.locator('#play').click()
  expect(await page.evaluate(autoplay, { games: 4 })).toBe(4)
  await expect(page.getByRole('heading', { name: 'Day 1 done!' })).toBeVisible()
  await expect(page.locator('.res .up')).toHaveCount(4) // a perfect day: every skill goes up 1% tomorrow

  await page.locator('#bye').click()
  await expect(page.getByText('Come back tomorrow for your next 1% 🌱')).toBeVisible()
  await expect(page.getByLabel('1 day streak')).toBeVisible()
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toHaveCount(4)
  await expect(page.getByRole('status')).not.toHaveText('Saved ✓') // nothing reached a server
})
