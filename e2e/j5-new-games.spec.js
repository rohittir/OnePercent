// @ts-check
// J5: each of the four newer games opens, the first time, with Percy's ghost hand playing a demo round ("Watch me first"),
// then the child plays and passes it; the next 1% unlocks.
import { expect, test } from '@playwright/test'
import { autoplay, fixDay, newPlayer } from './helpers.js'

test('J5: Watch me first, then Sort Switch, Firefly Catch, Route Planner and Pattern Grid are each passed', async ({ page }) => {
  await fixDay(page)
  await page.route('**/api/**', (route) => route.abort())
  await newPlayer(page, { name: 'Ravi', age: 9 }) // age 9 starts every skill at level 10
  const more = page.getByRole('navigation', { name: 'More games' })
  await expect(more.getByRole('link')).toHaveText(['🔀 Sort Switch', '🐞 Firefly Catch', '🧭 Route Planner', '🔳 Pattern Grid'])

  for (const name of ['Sort Switch', 'Firefly Catch', 'Route Planner', 'Pattern Grid']) {
    await page.goto('/play')
    await page.getByRole('navigation', { name: 'More games' }).getByRole('link', { name: new RegExp(name) }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await page.getByRole('button', { name: 'Start' }).click()

    // The demo: the badge, the ghost hand, and Percy's "That's how!" before the child's first question.
    await expect(page.locator('.watch')).toHaveText('👀 Watch me first')
    await expect(page.locator('.hand')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.cheer')).toHaveText("That's how! Your turn 👍", { timeout: 20_000 })
    await expect(page.locator('#foot, .foot')).toContainText('question 1 of', { timeout: 5_000 })

    await page.evaluate(autoplay, {})
    await expect(page.getByRole('heading', { name: 'Level 11 unlocked!' })).toBeVisible()
  }

  // Played once, the demo is offered, not forced.
  await page.goto('/play/sort-switch')
  await expect(page.getByRole('button', { name: 'Show me how 👀' })).toBeVisible()
})
