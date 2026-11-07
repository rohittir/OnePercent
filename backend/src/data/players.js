// @ts-check
// Reads and writes of players and their days. The routes in ../players.js decide; this file only talks to the table.
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getRawClient, getTable, isConditionFailure, tableName } from './client.js'
import { dayKey, playerKey } from './schema.js'

const Player = () => getTable().getModel('Player')
const Day = () => getTable().getModel('Day')

/**
 * @typedef {{ code: string, name: string, age: number, muted?: boolean, updatedAt: number, startLevels: Record<string, number>,
 *   pinHash: string, pinSalt: string, tokenHashes?: string[], failedPins?: number, lockedUntil?: number, rev: number, createdAt: number }} PlayerItem
 * @typedef {{ code: string, date: string, results: Record<string, any>, rev: number }} DayItem
 */

/** @param {Omit<PlayerItem, 'rev'>} item @returns {Promise<boolean>} false when the code is taken */
export async function createPlayer(item) {
  try {
    await Player().create({ ...item, rev: 0, failedPins: 0 }, { exists: false })
    return true
  } catch (err) {
    if (isConditionFailure(err)) return false
    throw err
  }
}

/** @param {string} code @returns {Promise<PlayerItem | undefined>} */
export const getPlayer = async (code) => /** @type {PlayerItem | undefined} */ (await Player().get({ code }, { consistent: true }))

/** @param {string} code @param {string[]} dates @returns {Promise<Map<string, DayItem>>} */
export async function getDays(code, dates) {
  const items = await Promise.all(dates.map((date) => Day().get({ code, date }, { consistent: true })))
  return new Map(/** @type {DayItem[]} */ (items.filter(Boolean)).map((d) => [d.date, d]))
}

/** @param {string} code @returns {Promise<DayItem[]>} every day of the player */
export async function listDays(code) {
  /** @type {DayItem[]} */
  const all = []
  let next
  do {
    const page = /** @type {any} */ (await Day().find({ code }, { consistent: true, next }))
    all.push(...page)
    next = page.next
  } while (next)
  return all
}

/**
 * Writes days and raises the player's rev in one transaction, so the revs of days commit in order and a reader that sees rev R
 * has every day up to R. The transaction fails when the player's rev or any day moved since it was read; the caller re-reads and retries.
 * @param {string} code
 * @param {number} expectRev the player's rev when the days were read
 * @param {{ date: string, results: Record<string, any>, seenRev: number | null }[]} writes seenRev null for a day that did not exist
 * @returns {Promise<number | null>} the new rev, or null on a conflict
 */
export async function writeDays(code, expectRev, writes) {
  const rev = expectRev + 1
  const TableName = tableName()
  const names = { '#rev': 'rev' }
  try {
    await getRawClient().send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName, Key: marshall(playerKey(code)), UpdateExpression: 'SET #rev = :rev', ConditionExpression: '#rev = :expect',
            ExpressionAttributeNames: names, ExpressionAttributeValues: marshall({ ':rev': rev, ':expect': expectRev }),
          },
        },
        ...writes.map(({ date, results, seenRev }) => ({
          Put: {
            TableName,
            // _type is OneTable's model marker, so the Day model reads these items as its own.
            Item: marshall({ ...dayKey(code, date), _type: 'Day', code, date, results, rev }, { removeUndefinedValues: true }),
            ...(seenRev === null
              ? { ConditionExpression: 'attribute_not_exists(pk)' }
              : { ConditionExpression: '#rev = :seen', ExpressionAttributeNames: names, ExpressionAttributeValues: marshall({ ':seen': seenRev }) }),
          },
        })),
      ],
    }))
    return rev
  } catch (err) {
    if (/** @type {any} */ (err)?.name === 'TransactionCanceledException') return null
    throw err
  }
}

/** The later edit wins: an older profile than the stored one changes nothing. @param {string} code @param {{ name: string, age: number, muted: boolean, updatedAt: number }} profile */
export async function updateProfile(code, profile) {
  try {
    await Player().update({ code, ...profile }, { where: `\${updatedAt} < {${profile.updatedAt}}` })
  } catch (err) {
    if (!isConditionFailure(err)) throw err
  }
}

/** A wrong PIN; the fifth in a row locks the player until `lockUntil`. @param {string} code @param {number} max @param {number} lockUntil */
export async function recordFailure(code, max, lockUntil) {
  const after = /** @type {PlayerItem} */ (await Player().update({ code }, { add: { failedPins: 1 }, return: 'ALL_NEW' }))
  if ((after.failedPins ?? 0) >= max) await Player().update({ code, failedPins: 0, lockedUntil: lockUntil })
}

/** A right PIN: keep the new device's token (the newest `max`), and clear the failures. @param {string} code @param {string} tokenHash @param {number} max */
export async function addToken(code, tokenHash, max) {
  const player = await getPlayer(code)
  const tokenHashes = [...(player?.tokenHashes ?? []), tokenHash].slice(-max)
  await Player().update({ code, tokenHashes, failedPins: 0, lockedUntil: null })
}

/** @param {string} code @param {{ hash: string, salt: string }} pin */
export const setPin = (code, { hash, salt }) => Player().update({ code, pinHash: hash, pinSalt: salt })

/** Days first, then the player, so a failure part-way leaves a player that can be deleted again. @param {string} code */
export async function deletePlayer(code) {
  const days = await listDays(code)
  for (let i = 0; i < days.length; i += 25) await Promise.all(days.slice(i, i + 25).map(({ date }) => Day().remove({ code, date })))
  await Player().remove({ code })
}
