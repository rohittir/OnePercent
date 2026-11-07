// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveStage } from './stages.js'

test('prod keeps its data; dev does not', () => {
  const prod = resolveStage('prod')
  assert.equal(prod.pitr, true)
  assert.equal(prod.retain, true)
  const dev = resolveStage()
  assert.equal(dev.name, 'dev')
  assert.equal(dev.retain, false)
})

test('an unknown stage is refused', () => {
  assert.throws(() => resolveStage('staging'), /dev or prod/)
})
