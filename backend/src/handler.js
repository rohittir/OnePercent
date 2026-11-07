// @ts-check
// The API Lambda, behind an API Gateway HTTP API (payload 2.0). src/local.js runs the same handler on this machine.
// lambda-api answers an unknown path or method with a JSON 404 or 405 itself.
import createAPI from 'lambda-api'

const api = createAPI({ base: 'api/v1', logger: false })

api.get('/health', () => ({ ok: true }))

/**
 * @param {any} event
 * @param {any} context
 */
export const handler = (event, context) => api.run(event, context)
