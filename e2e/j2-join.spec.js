// @ts-check
// J2: a second device joins by typing the ID and PIN, a third by the QR link; a wrong PIN is refused.
import { expect, test } from '@playwright/test'
import { autoplay, newPlayer, phone, saved } from './helpers.js'

test('J2: another device joins by ID and PIN, or by the QR link, and sees the progress', async ({ browser }) => {
  const a = await (await browser.newContext(phone)).newPage()
  await newPlayer(a, { name: 'Arjun', age: 12, pin: '2468' })
  await expect(a.getByText('Mission 1')).toBeVisible() // over 10: the galaxy
  await a.locator('#play').click()
  expect(await a.evaluate(autoplay, { games: 1 })).toBe(1)
  await a.goto('/play')
  await saved(a)

  await a.goto('/move')
  const code = (await a.getByLabel('Your ID').textContent())?.trim() ?? ''
  expect(code).toMatch(/^[a-z]+-[a-z]+-\d\d$/)
  await expect(a.getByRole('img', { name: 'QR code to join on another device' })).toBeVisible()
  await a.getByRole('button', { name: 'Show my PIN' }).click()
  await expect(a.getByLabel('Your PIN')).toHaveText('PIN 2468')

  const typed = await (await browser.newContext(phone)).newPage()
  await typed.goto('/join')
  await typed.getByLabel('Your ID').fill(code.toUpperCase().replaceAll('-', ' ')) // as a child might type it
  await typed.getByLabel('Your PIN').fill('2468')
  await typed.getByRole('button', { name: 'Join' }).click()
  await expect(typed.getByText('Mission 1')).toBeVisible()
  await expect(typed.locator('.planet').first().getByRole('img', { name: /of 3 stars/ })).toBeVisible() // Echo, played on device A

  const scanned = await (await browser.newContext(phone)).newPage()
  await scanned.goto(`/join#${code}.2468`)
  await expect(scanned.getByText('Mission 1')).toBeVisible()
  expect(new URL(scanned.url()).hash).toBe('') // the PIN left the address bar

  const wrong = await (await browser.newContext(phone)).newPage()
  await wrong.goto('/join')
  await wrong.getByLabel('Your ID').fill(code)
  await wrong.getByLabel('Your PIN').fill('0000')
  await wrong.getByRole('button', { name: 'Join' }).click()
  await expect(wrong.getByRole('alert')).toHaveText("That ID and PIN don't match.")
})
