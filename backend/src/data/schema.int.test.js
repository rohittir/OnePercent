// @ts-check
// Needs DynamoDB Local: npm run stack:up. Uses a table of its own and deletes it.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.TABLE_NAME = `onepercent-test-${process.pid}`
const { getTable } = await import('./client.js')
const table = getTable()

before(() => table.createTable())
after(() => table.deleteTable('DeleteTableForever'))

test('a player and a day round-trip under the keys of schema.js', async () => {
  const Player = table.getModel('Player')
  const Day = table.getModel('Day')
  await Player.create({ code: 'brave-otter-27', name: 'Maya', age: 8, startLevels: { memory: 5 }, updatedAt: 1, pinHash: 'h', pinSalt: 's', createdAt: 1 })
  await Day.create({ code: 'brave-otter-27', date: '2026-11-06', results: { echo: { score: 0.8 } }, rev: 1 })

  const player = await Player.get({ code: 'brave-otter-27' }, { hidden: true })
  assert.equal(player?.pk, 'PLAYER#brave-otter-27')
  assert.equal(player?.sk, 'PROFILE')
  assert.equal(player?.name, 'Maya')
  assert.equal(player?.failedPins, 0)

  const days = await Day.find({ code: 'brave-otter-27' }, { hidden: true })
  assert.deepEqual(days.map((d) => [d.sk, d.results.echo.score]), [['DAY#2026-11-06', 0.8]])
})
