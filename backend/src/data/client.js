// @ts-check
// The one place that makes the DynamoDB client and the OneTable table. Only src/data/ imports @aws-sdk/* and dynamodb-onetable.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Table } from 'dynamodb-onetable'
import { Dynamo } from 'dynamodb-onetable/Dynamo'
import { SCHEMA } from './schema.js'

/** @type {DynamoDBClient | undefined} */
let client
/** @type {Table | undefined} */
let table

/** @returns {string} the table named by TABLE_NAME */
export const tableName = () => /** @type {string} */ (process.env.TABLE_NAME)

/** @returns {DynamoDBClient} made on first use */
export function getRawClient() {
  const endpoint = process.env.DYNAMODB_ENDPOINT || undefined
  client ??= new DynamoDBClient({
    region: process.env.AWS_REGION,
    endpoint,
    // DynamoDB Local takes any credentials. Without an endpoint, the default chain applies.
    credentials: endpoint ? { accessKeyId: 'local', secretAccessKey: 'local' } : undefined,
    maxAttempts: 3,
  })
  return client
}

/** @returns {Table} the OneTable table, made on first use */
export function getTable() {
  table ??= new Table({
    client: /** @type {any} */ (new Dynamo({ client: /** @type {any} */ (getRawClient()), marshall: { removeUndefinedValues: true } })),
    name: tableName(),
    schema: /** @type {any} */ (SCHEMA),
    partial: false,
  })
  return table
}

/** @param {any} err @returns {boolean} true when a write's condition failed */
export const isConditionFailure = (err) =>
  [err?.code, err?.name, err?.context?.code, err?.context?.err?.name].includes('ConditionalCheckFailedException')
