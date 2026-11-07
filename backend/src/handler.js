// @ts-check
// The API Lambda, behind an API Gateway HTTP API (payload 2.0). src/local.js runs the same handler on this machine.
import createAPI from 'lambda-api'
import { HttpError } from './lib/http.js'
import { playerRoutes } from './players.js'

const api = createAPI({ base: 'api/v1', logger: false })

api.get('/health', () => ({ ok: true }))
playerRoutes(api)

// One error middleware: a known error becomes its answer; anything else is logged and answers 500 with no detail.
// lambda-api answers an unknown path or method with a JSON 404 or 405 itself.
api.use(/** @type {any} */ ((/** @type {any} */ err, /** @type {any} */ _req, /** @type {any} */ res, /** @type {() => void} */ next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err?.name === 'RouteError' || err?.name === 'MethodError') return next()
  console.error(JSON.stringify({ msg: 'error', name: err?.name, message: err?.message, stack: err?.stack }))
  res.status(500).json({ error: 'internal' })
}))

/**
 * @param {any} event
 * @param {any} context
 */
export const handler = (event, context) => api.run(event, context)
