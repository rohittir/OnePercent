// @ts-check
// The one place that makes the DynamoDB client and the OneTable table. Only src/data/ imports @aws-sdk/* and dynamodb-onetable.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Table } from 'dynamodb-onetable'
import { Dynamo } from 'dynamodb-onetable/Dynamo'
import { SCHEMA } from './schema.js'

/** @type {Table | undefined} */
let table

/** @returns {Table} the table named by TABLE_NAME, made on first use */
export function getTable() {
  if (table) return table
  const endpoint = process.env.DYNAMODB_ENDPOINT || undefined
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    endpoint,
    // DynamoDB Local takes any credentials. Without an endpoint, the default chain applies.
    credentials: endpoint ? { accessKeyId: 'local', secretAccessKey: 'local' } : undefined,
    maxAttempts: 3,
  })
  table = new Table({
    client: /** @type {any} */ (new Dynamo({ client: /** @type {any} */ (client), marshall: { removeUndefinedValues: true } })),
    name: process.env.TABLE_NAME,
    schema: /** @type {any} */ (SCHEMA),
    partial: false,
  })
  return table
}
