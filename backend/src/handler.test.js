// @ts-check
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handler } from './handler.js'

/** @param {string} method @param {string} path */
const call = (method, path) => handler({
  version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: '', headers: {}, isBase64Encoded: false,
  requestContext: { http: { method, path, sourceIp: '127.0.0.1' }, requestId: 'test' },
}, {})

test('GET /api/v1/health answers 200 ok', async () => {
  const res = await call('GET', '/api/v1/health')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.body), { ok: true })
})

test('an unknown /api path answers a JSON 404', async () => {
  const res = await call('GET', '/api/v1/nope')
  assert.equal(res.statusCode, 404)
  assert.ok(JSON.parse(res.body).error)
})
