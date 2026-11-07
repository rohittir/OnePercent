// @ts-check
// The player routes (docs/ARCHITECTURE.md, "API").
import { randomInt } from 'node:crypto'
import { makeCode } from '@onepercent/shared/ids.js'
import { mergeResults } from '@onepercent/shared/merge.js'
import { ClaimBody, Code, CreateBody, PinBody, SyncBody } from '@onepercent/shared/schemas.js'
import * as repo from './data/players.js'
import { clock, HttpError, parse } from './lib/http.js'
import { hashPin, hashToken, newToken, NOBODY, verifyPin } from './lib/secrets.js'

const MAX_FAILS = 5
const LOCK_MS = 15 * 60_000
const MAX_TOKENS = 10
const MAX_TRIES = 5
// A transaction holds 100 writes: the player and up to 99 days.
const CHUNK = 50

/** @param {import('./data/players.js').PlayerItem} p what a client may see of a player */
const publicProfile = (p) => ({ name: p.name, age: p.age, muted: Boolean(p.muted), updatedAt: p.updatedAt })

/** @param {import('lambda-api').API} api */
export function playerRoutes(api) {
  api.post('/players', create)
  api.post('/players/claim', claim)
  api.post('/players/:code/sync', sync)
  api.put('/players/:code/pin', changePin)
  api.delete('/players/:code', remove)
}

/** @param {any} req @param {any} res */
async function create(req, res) {
  const body = parse(CreateBody, req.body)
  const pin = await hashPin(body.pin)
  const token = newToken()
  let code
  for (let i = 1; ; i++) {
    code = makeCode(randomInt)
    const made = await repo.createPlayer({
      code, ...body.profile, startLevels: body.startLevels, pinHash: pin.hash, pinSalt: pin.salt, tokenHashes: [hashToken(token)], createdAt: clock.now(),
    })
    if (made) break
    if (i === MAX_TRIES) throw new HttpError(503, 'busy')
  }
  res.status(201).json({ code, token, startLevels: body.startLevels, ...(await syncDays(code, body.days, 0)) })
}

/** @param {any} req @param {any} res */
async function claim(req, res) {
  const { code, pin } = parse(ClaimBody, req.body)
  const now = clock.now()
  const player = await repo.getPlayer(code)
  if (player?.lockedUntil && player.lockedUntil > now) throw new HttpError(429, 'locked')
  // An unknown ID costs the same work and gets the same answer as a wrong PIN.
  const ok = await verifyPin(pin, player ?? NOBODY)
  if (!player || !ok) {
    if (player) await repo.recordFailure(code, MAX_FAILS, now + LOCK_MS)
    throw new HttpError(401, 'unauthorized')
  }
  const token = newToken()
  await repo.addToken(code, hashToken(token), MAX_TOKENS)
  res.json({ token, startLevels: player.startLevels, ...(await syncDays(code, {}, 0)) })
}

/** @param {any} req @param {any} res */
async function sync(req, res) {
  const player = await authed(req)
  const body = parse(SyncBody, req.body)
  if (body.profile && body.profile.updatedAt > player.updatedAt) await repo.updateProfile(player.code, body.profile)
  res.json(await syncDays(player.code, body.days, body.since))
}

/** @param {any} req @param {any} res */
async function changePin(req, res) {
  const player = await authed(req)
  const { pin } = parse(PinBody, req.body)
  await repo.setPin(player.code, await hashPin(pin))
  res.status(204).send()
}

/** @param {any} req @param {any} res */
async function remove(req, res) {
  const player = await authed(req)
  await repo.deletePlayer(player.code)
  res.status(204).send()
}

/** @param {any} req @returns {Promise<import('./data/players.js').PlayerItem>} the player whose token the request carries */
async function authed(req) {
  const code = Code.safeParse(req.params.code)
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1]
  const player = code.success && token ? await repo.getPlayer(code.data) : undefined
  if (!player || !token || !player.tokenHashes?.includes(hashToken(token))) throw new HttpError(401, 'unauthorized')
  return player
}

/**
 * Merges incoming days into the stored ones (best score per game), then answers with the profile, every day with a rev above `since`,
 * and the rev to send next time. Reading the rev before the days means no day at or under it can be missed (data/players.js, writeDays).
 * @param {string} code
 * @param {Record<string, Record<string, any>>} incoming
 * @param {number} since
 */
async function syncDays(code, incoming, since) {
  const dates = Object.keys(incoming).sort()
  for (let i = 0; i < dates.length; i += CHUNK) {
    const chunk = dates.slice(i, i + CHUNK)
    for (let attempt = 1; ; attempt++) {
      const [player, stored] = await Promise.all([repo.getPlayer(code), repo.getDays(code, chunk)])
      if (!player) throw new HttpError(401, 'unauthorized')
      const writes = []
      for (const date of chunk) {
        const before = stored.get(date)
        const merged = mergeResults(before?.results, incoming[date])
        // mergeResults keeps the stored object when it wins, so nothing new means the same objects.
        if (before && Object.keys(merged).every((id) => merged[id] === before.results[id])) continue
        writes.push({ date, results: merged, seenRev: before?.rev ?? null })
      }
      if (!writes.length || (await repo.writeDays(code, player.rev, writes)) !== null) break
      if (attempt === MAX_TRIES) throw new HttpError(503, 'busy')
    }
  }
  const player = await repo.getPlayer(code)
  if (!player) throw new HttpError(401, 'unauthorized')
  const days = await repo.listDays(code)
  return {
    profile: publicProfile(player),
    days: Object.fromEntries(days.filter((d) => d.rev > since).map((d) => [d.date, d.results])),
    rev: player.rev,
  }
}
