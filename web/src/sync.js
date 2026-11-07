// @ts-check
// Shares each player's progress with the backend (docs/ARCHITECTURE.md, "When a device syncs"):
// on open, soon after a change, every 5 minutes, when the page hides and when the network returns. Play never waits for it.
import { MAX_DAYS } from '@onepercent/shared/schemas.js'
import * as api from './api.js'
import { applySync, findPlayer, getState, markUnlinked } from './store.js'

const EVERY_MS = 5 * 60_000
const SOON_MS = 2_000

/** @type {ReturnType<typeof setTimeout> | undefined} */
let timer
/** @type {Promise<void> | null} */
let running = null
let failures = 0

/** @param {number} ms */
function schedule(ms) {
  clearTimeout(timer)
  timer = setTimeout(syncAll, ms)
}

async function run() {
  try {
    for (const { localId } of getState().players) await syncOne(localId)
    failures = 0
  } catch {
    failures++
  }
}

/** Syncs every player on the device, one at a time. A second call while one runs waits for it. */
export function syncAll() {
  // .finally always runs after `running` is set, even when run() has nothing to await (no players yet).
  running ??= run().finally(() => {
    running = null
    // Backoff after a failure: 5 s, 10 s, 20 s… up to the usual 5 minutes.
    schedule(failures ? Math.min(EVERY_MS, 5_000 * 2 ** (failures - 1)) : EVERY_MS)
  })
  return running
}

/** After a change: sync in a moment, unless the network is failing, when the backoff already holds the next try. */
export function requestSync() {
  if (!failures) schedule(SOON_MS)
}

/** @param {string} localId */
async function syncOne(localId) {
  const p = findPlayer(localId)
  if (!p || p.unlinked) return
  const dates = Object.keys(p.dirty).sort().slice(0, MAX_DAYS)
  const sent = { dirty: Object.fromEntries(dates.map((d) => [d, p.dirty[d]])), profileDirty: p.profileDirty }
  const days = Object.fromEntries(dates.map((d) => [d, p.days[d]]))
  const profile = { name: p.name, age: p.age, muted: p.muted, updatedAt: p.updatedAt }
  try {
    const res = p.code && p.token
      ? await api.syncPlayer(p.code, p.token, { since: p.rev, days, ...(p.profileDirty ? { profile } : {}) })
      : await api.createPlayer({ profile, startLevels: p.startLevels, pin: p.pin, days })
    applySync(localId, sent, res)
  } catch (err) {
    // The token no longer opens the player (deleted on another device): stop trying; Settings offers to join again.
    if (/** @type {any} */ (err).status === 401 && p.code) return markUnlinked(localId)
    throw err
  }
  // More dirty days than one sync carries: send the rest now.
  if (dates.length === MAX_DAYS && Object.keys(findPlayer(localId)?.dirty ?? {}).length) await syncOne(localId)
}

/** Starts the loop. Call once. */
export function startSync() {
  void syncAll()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncAll()
  })
  addEventListener('online', () => void syncAll())
}

/** @param {import('./store.js').Player} p @returns {'saved' | 'saving' | 'device' | 'unlinked'} what the status line says */
export function syncState(p) {
  if (p.unlinked) return 'unlinked'
  const pending = !p.code || p.profileDirty > 0 || Object.keys(p.dirty).length > 0
  if (!pending) return 'saved'
  return navigator.onLine ? 'saving' : 'device'
}
