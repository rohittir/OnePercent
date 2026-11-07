// @ts-check
// Needs DynamoDB Local: npm run stack:up. Runs the real handler against a table of its own and deletes it.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.TABLE_NAME = `onepercent-players-${process.pid}`
const { getTable } = await import('./data/client.js')
const { handler } = await import('./handler.js')
const { clock } = await import('./lib/http.js')

before(() => getTable().createTable())
after(() => getTable().deleteTable('DeleteTableForever'))

/** @param {string} method @param {string} path @param {unknown} [body] @param {string} [token] */
async function call(method, path, body, token) {
  const res = await handler({
    version: '2.0', routeKey: '$default', rawPath: `/api/v1${path}`, rawQueryString: '', isBase64Encoded: false,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { http: { method, path: `/api/v1${path}`, sourceIp: '127.0.0.1' }, requestId: 'test' },
  }, {})
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null, raw: res.body ?? '' }
}

const profile = { name: 'Maya', age: 8, muted: false, updatedAt: 1000 }
const startLevels = { memory: 5, focus: 5, logic: 5, speed: 5 }
/** @param {string} skill @param {number} best @param {number} top @param {number} [playedAt] */
const r = (skill, best, top, playedAt = 1) => ({ skill, best, top, playedAt })
const SECRET = /pinHash|pinSalt|tokenHashes|failedPins|lockedUntil/

/** @param {Record<string, any>} [days] */
async function newPlayer(days = {}) {
  const res = await call('POST', '/players', { profile, startLevels, pin: '4821', days })
  assert.equal(res.status, 201)
  return res.body
}

test('create: a word ID, a token, and the days played offline', async () => {
  const res = await newPlayer({ '2026-11-05': { echo: r('memory', 0.8, 5) } })
  assert.match(res.code, /^[a-z]+-[a-z]+-\d\d$/)
  assert.ok(res.token.length > 30)
  assert.deepEqual(res.profile, profile)
  assert.deepEqual(res.days['2026-11-05'].echo, r('memory', 0.8, 5))
  assert.equal(res.rev, 1)
  assert.doesNotMatch(JSON.stringify(res), SECRET)
  assert.equal((await call('POST', '/players', { profile, startLevels, pin: '48', days: {} })).status, 400)
})

test('claim: a wrong PIN and an unknown ID answer alike; the right one gives a new token and every day', async () => {
  const { code } = await newPlayer({ '2026-11-05': { echo: r('memory', 1, 5) } })
  const wrong = await call('POST', '/players/claim', { code, pin: '0000' })
  const unknown = await call('POST', '/players/claim', { code: 'nobody-here-11', pin: '4821' })
  assert.equal(wrong.status, 401)
  assert.deepEqual([unknown.status, unknown.raw], [wrong.status, wrong.raw])
  const ok = await call('POST', '/players/claim', { code, pin: '4821' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.days['2026-11-05'].echo.best, 1)
  assert.deepEqual(ok.body.startLevels, startLevels)
  assert.doesNotMatch(ok.raw, SECRET)
  assert.equal((await call('POST', `/players/${code}/sync`, { since: 0, days: {} }, ok.body.token)).status, 200, 'the new token works')
})

test('claim: five wrong PINs lock the player for 15 minutes, even against the right PIN', async () => {
  const { code } = await newPlayer()
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/players/claim', { code, pin: '0000' })).status, 401)
  assert.equal((await call('POST', '/players/claim', { code, pin: '4821' })).status, 429)
  const realNow = clock.now
  clock.now = () => realNow() + 16 * 60_000
  try {
    assert.equal((await call('POST', '/players/claim', { code, pin: '4821' })).status, 200)
  } finally {
    clock.now = realNow
  }
})

test('sync: needs the token; merges field by field; returns only days past `since`', async () => {
  const { code, token, rev } = await newPlayer({ '2026-11-05': { echo: r('memory', 0.6, -1) } })
  assert.equal((await call('POST', `/players/${code}/sync`, { since: 0, days: {} })).status, 401)
  assert.equal((await call('POST', `/players/${code}/sync`, { since: 0, days: {} }, 'not-the-token')).status, 401)

  const res = await call('POST', `/players/${code}/sync`, {
    since: rev, days: { '2026-11-05': { echo: r('memory', 0.4, -1, 2), odd: r('focus', 1, 5) }, '2026-11-06': { echo: r('memory', 1, 5) } },
  }, token)
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.days['2026-11-05'].echo, r('memory', 0.6, -1, 2), 'the best score stays; the latest play is kept')
  assert.deepEqual(res.body.days['2026-11-05'].odd, r('focus', 1, 5))
  assert.deepEqual(res.body.days['2026-11-06'].echo, r('memory', 1, 5))
  assert.equal(res.body.rev, rev + 1)

  const again = await call('POST', `/players/${code}/sync`, { since: res.body.rev, days: { '2026-11-06': { echo: r('memory', 1, 5) } } }, token)
  assert.deepEqual(again.body.days, {}, 'nothing new: no write, nothing returned')
  assert.equal(again.body.rev, res.body.rev)
})

test('sync: two devices at once both land, never losing a result', async () => {
  const { code, token } = await newPlayer()
  const claimed = await call('POST', '/players/claim', { code, pin: '4821' })
  const [a, b] = await Promise.all([
    call('POST', `/players/${code}/sync`, { since: 0, days: { '2026-11-06': { echo: r('memory', 0.8, 5) }, '2026-11-07': { echo: r('memory', 1, 6) } } }, token),
    call('POST', `/players/${code}/sync`, { since: 0, days: { '2026-11-06': { odd: r('focus', 0.6, -1) } } }, claimed.body.token),
  ])
  assert.deepEqual([a.status, b.status], [200, 200])
  const all = await call('POST', `/players/${code}/sync`, { since: 0, days: {} }, token)
  assert.deepEqual(Object.keys(all.body.days['2026-11-06']).sort(), ['echo', 'odd'])
  assert.ok(all.body.days['2026-11-07'])
})

test('sync: a day stored in the old shape (one play) merges and is rewritten in today\'s', async () => {
  const { code, token } = await newPlayer()
  await getTable().getModel('Day').create({ code, date: '2026-11-01', rev: 1, results: { echo: { skill: 'memory', score: 0.9, level: 5, rounds: 5, playedAt: 1 } } })
  const res = await call('POST', `/players/${code}/sync`, { since: 0, days: { '2026-11-01': { echo: r('memory', 0.6, -1, 2) } } }, token)
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.days['2026-11-01'].echo, r('memory', 0.9, 5, 2))
})

test('sync: the later profile edit wins', async () => {
  const { code, token } = await newPlayer()
  const newer = await call('POST', `/players/${code}/sync`, { since: 0, days: {}, profile: { ...profile, muted: true, updatedAt: 2000 } }, token)
  assert.equal(newer.body.profile.muted, true)
  const older = await call('POST', `/players/${code}/sync`, { since: 0, days: {}, profile: { ...profile, name: 'Old', updatedAt: 1500 } }, token)
  assert.equal(older.body.profile.name, 'Maya')
})

test('PIN change and delete', async () => {
  const { code, token } = await newPlayer({ '2026-11-05': { echo: r('memory', 1, 5) } })
  assert.equal((await call('PUT', `/players/${code}/pin`, { pin: '1234' }, token)).status, 204)
  assert.equal((await call('POST', '/players/claim', { code, pin: '4821' })).status, 401)
  assert.equal((await call('POST', '/players/claim', { code, pin: '1234' })).status, 200)

  assert.equal((await call('DELETE', `/players/${code}`, undefined, token)).status, 204)
  assert.equal((await call('POST', '/players/claim', { code, pin: '1234' })).status, 401)
  assert.equal((await call('POST', `/players/${code}/sync`, { since: 0, days: {} }, token)).status, 401)
  assert.equal((await call('DELETE', `/players/${code}`, undefined, token)).status, 401)
})
