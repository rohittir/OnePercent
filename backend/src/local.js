// @ts-check
// Runs the API Lambda on http://localhost:$PORT against DynamoDB Local (`npm run stack:up`), and makes the table first.
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { setTimeout as wait } from 'node:timers/promises'
import { getTable } from './data/client.js'
import { handler } from './handler.js'

// DynamoDB Local takes a moment after its container starts.
const table = getTable()
for (let attempt = 1; ; attempt++) {
  try {
    if (!(await table.exists())) await table.createTable()
    break
  } catch (err) {
    if (attempt === 20) throw new Error(`DynamoDB Local is not answering at ${process.env.DYNAMODB_ENDPOINT}. Run npm run stack:up.`, { cause: err })
    await wait(500)
  }
}

createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const url = new URL(req.url ?? '/', 'http://localhost')
  // The shape of an API Gateway HTTP API event, payload 2.0.
  const result = await handler({
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: req.headers,
    body: chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method, path: url.pathname, sourceIp: req.socket.remoteAddress }, requestId: randomUUID() },
  }, {})
  res.writeHead(result.statusCode, result.headers).end(result.body)
}).listen(Number(process.env.PORT), '127.0.0.1', () => {
  console.log(`API on http://localhost:${process.env.PORT}/api/v1/health, table ${process.env.TABLE_NAME}`)
})
