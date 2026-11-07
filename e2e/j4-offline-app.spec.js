// @ts-check
// J4: the built app, under the CSP CloudFront sends, keeps itself for offline use and opens and plays with the network off.
import { expect, test } from '@playwright/test'
import { newPlayer, phone } from './helpers.js'

test('J4: the installed app opens and plays offline, with nothing blocked by the CSP', async ({ browser }) => {
  const context = await browser.newContext({ ...phone, baseURL: 'http://localhost:5181' })
  const page = await context.newPage()
  /** @type {string[]} */
  const blocked = []
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) blocked.push(m.text()) })

  await newPlayer(page, { name: 'Bo', age: 9 })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // now the service worker controls the page and keeps what it fetches, fonts included
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await expect(page.getByText('Ready to grow, Bo?')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Ready to grow, Bo?')).toBeVisible()
  await page.locator('#play').click()
  await expect(page.getByRole('heading', { name: 'Echo' })).toBeVisible()
  await page.goto('/join') // a page never opened before also comes from the kept app
  await expect(page.getByRole('heading', { name: 'Join from another device' })).toBeVisible()

  expect(blocked).toEqual([])
  await context.close()
})
