// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, AGES, bandFor } from './bands.js'
import { SKILLS, nextLevel, startLevels, starsFor } from './levels.js'

test('nextLevel: up on 80%+, down under 50%, never below 0', () => {
  assert.equal(nextLevel(5, 0.8), 6)
  assert.equal(nextLevel(5, 1), 6)
  assert.equal(nextLevel(5, 0.6), 5)
  assert.equal(nextLevel(5, 0.5), 5)
  assert.equal(nextLevel(5, 0.4), 4)
  assert.equal(nextLevel(0, 0), 0)
})

test('starsFor: 3 from 90%, 2 from 60%, else 1', () => {
  assert.deepEqual([1, 0.9, 0.8, 0.6, 0.4, 0].map(starsFor), [3, 3, 2, 2, 1, 1])
})

test('startLevels: every skill, 5 steps per year over 7', () => {
  assert.deepEqual(startLevels(7), { memory: 0, focus: 0, logic: 0, speed: 0 })
  assert.deepEqual(Object.keys(startLevels(14)), [...SKILLS])
  assert.equal(startLevels(14).logic, 35)
})

test('bands: 7–10 is percy, 11–14 is galaxy, no gaps or overlaps', () => {
  assert.equal(bandFor(7)?.id, 'percy')
  assert.equal(bandFor(10)?.id, 'percy')
  assert.equal(bandFor(11)?.id, 'galaxy')
  assert.equal(bandFor(14)?.id, 'galaxy')
  assert.equal(bandFor(6), undefined)
  assert.equal(bandFor(15), undefined)
  assert.deepEqual(AGES, [7, 14])
  for (let i = 1; i < BANDS.length; i++) assert.equal(BANDS[i].ages[0], BANDS[i - 1].ages[1] + 1)
})
