// @ts-check
// The device's copy of every player on it, in localStorage. It is the source of truth on the device; sync.js shares it with the backend.
import { useSyncExternalStore } from 'react'
import { startLevels } from '@onepercent/shared/levels.js'
import { mergeDays, mergeProfile, mergeResults } from '@onepercent/shared/merge.js'

const KEY = 'onepercent:v1'

/**
 * @typedef {import('@onepercent/shared/merge.js').Days} Days
 * @typedef {import('@onepercent/shared/merge.js').Result} Result
 * @typedef {{
 *   localId: string, code: string | null, token: string | null, pin: string,
 *   name: string, age: number, muted: boolean, updatedAt: number, startLevels: Record<string, number>,
 *   days: Days, dirty: Record<string, number>, profileDirty: number, rev: number, syncedAt?: number, unlinked?: boolean,
 * }} Player
 *   dirty: dates changed since the last sync, each with a counter that grows on every change, so a sync clears only what it sent.
 * @typedef {{ players: Player[], current: string | null, deletes: { code: string, token: string }[] }} State
 *   deletes: players deleted on this device whose online copy is still to be deleted (sync.js does it when online)
 */

const EMPTY = /** @type {State} */ ({ players: [], current: null, deletes: [] })

/** A start level for every skill: players made before a skill existed start it at their age's level. @param {Record<string, number>} levels @param {number} age */
const allSkills = (levels, age) => ({ ...startLevels(age), ...levels })

/** @returns {State} */
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && Array.isArray(saved.players)) {
      // Results saved before 7 November 2026 had another shape; mergeDays reads them as today's.
      return { ...EMPTY, ...saved, players: saved.players.map((/** @type {Player} */ p) => ({ ...p, startLevels: allSkills(p.startLevels, p.age), days: mergeDays({}, p.days) })) }
    }
  } catch { /* unreadable: start empty */ }
  return EMPTY
}

let state = read()
/** @type {Set<() => void>} */
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

/** @param {State} next */
function commit(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // shortcut: a full or blocked storage keeps this change in memory only; the server copy still has whatever synced. Warn the parent when it matters.
  }
  notify()
}

// Another tab of the app changed it.
addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  state = read()
  notify()
})

export const getState = () => state
/** @param {() => void} listener */
export const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const usePlayers = () => useSyncExternalStore(subscribe, () => state.players)
export const useCurrentPlayer = () => useSyncExternalStore(subscribe, () => state.players.find((p) => p.localId === state.current) ?? null)
/** @param {string} localId */
export const findPlayer = (localId) => state.players.find((p) => p.localId === localId)

/** @param {string} localId @param {(p: Player) => Player} change */
const update = (localId, change) => commit({ ...state, players: state.players.map((p) => (p.localId === localId ? change(p) : p)) })

/** @returns {string} the device's date, YYYY-MM-DD */
export const today = (d = new Date()) => d.toLocaleDateString('en-CA')

/** @param {{ name: string, age: number, pin: string }} input @returns {Player} */
export function addPlayer({ name, age, pin }) {
  /** @type {Player} */
  const player = {
    localId: crypto.randomUUID(), code: null, token: null, pin, name: name.trim(), age, muted: false, updatedAt: Date.now(),
    startLevels: startLevels(age), days: {}, dirty: {}, profileDirty: 1, rev: 0,
  }
  commit({ ...state, players: [...state.players, player], current: player.localId })
  return player
}

/** @param {string | null} localId */
export const selectPlayer = (localId) => commit({ ...state, current: localId })

/** One play of a game, merged into the date's result for it (best score, highest level passed). @param {string} localId @param {string} date @param {string} gameId @param {Result} result */
export function recordResult(localId, date, gameId, result) {
  update(localId, (p) => ({
    ...p,
    days: { ...p.days, [date]: mergeResults(p.days[date], { [gameId]: result }) },
    dirty: { ...p.dirty, [date]: (p.dirty[date] ?? 0) + 1 },
  }))
}

/** @param {string} localId @param {boolean} muted */
export const setMuted = (localId, muted) => update(localId, (p) => ({ ...p, muted, updatedAt: Date.now(), profileDirty: p.profileDirty + 1 }))
/** @param {string} localId @param {string} pin */
export const setPin = (localId, pin) => update(localId, (p) => ({ ...p, pin }))
/** @param {string} localId */
export const markUnlinked = (localId) => update(localId, (p) => ({ ...p, unlinked: true }))

/** Gone from this device at once; the online copy is deleted by the next sync (sync.js), now if online. @param {string} localId */
export function removePlayer(localId) {
  const p = findPlayer(localId)
  commit({
    players: state.players.filter((x) => x.localId !== localId),
    current: state.current === localId ? null : state.current,
    deletes: p?.code && p.token && !p.unlinked ? [...state.deletes, { code: p.code, token: p.token }] : state.deletes,
  })
}

/** A player made online after it was deleted here (its create was in flight). @param {string} code @param {string} token */
export const queueDelete = (code, token) => commit({ ...state, deletes: [...state.deletes, { code, token }] })
/** The online copy is gone. @param {string} code */
export const deleteDone = (code) => commit({ ...state, deletes: state.deletes.filter((d) => d.code !== code) })

/**
 * After a create or a sync: merge what came back, and clear only what didn't change while the request was out.
 * @param {string} localId
 * @param {{ dirty: Record<string, number>, profileDirty: number }} sent
 * @param {{ code?: string, token?: string, profile: import('@onepercent/shared/merge.js').Profile, days: Days, rev: number }} res
 */
export function applySync(localId, sent, res) {
  update(localId, (p) => {
    const dirty = { ...p.dirty }
    for (const [date, n] of Object.entries(sent.dirty)) if (dirty[date] === n) delete dirty[date]
    return {
      ...mergeProfile(p, res.profile), code: res.code ?? p.code, token: res.token ?? p.token,
      days: mergeDays(p.days, res.days), dirty, profileDirty: p.profileDirty === sent.profileDirty ? 0 : p.profileDirty,
      rev: res.rev, syncedAt: Date.now(), unlinked: false,
    }
  })
}

/**
 * A player joined from another device: new here, or a code already on this device, whose copy is merged.
 * @param {{ code: string, token: string, pin: string, profile: import('@onepercent/shared/merge.js').Profile, startLevels: Record<string, number>, days: Days, rev: number }} joined
 */
export function importPlayer({ code, token, pin, profile, startLevels: levels, days, rev }) {
  const here = state.players.find((p) => p.code === code)
  if (here) {
    update(here.localId, (p) => ({ ...mergeProfile(p, profile), token, pin, days: mergeDays(p.days, days), rev, unlinked: false, syncedAt: Date.now() }))
    selectPlayer(here.localId)
    return
  }
  /** @type {Player} */
  const player = {
    localId: crypto.randomUUID(), code, token, pin, ...profile, startLevels: allSkills(levels, profile.age), days, dirty: {}, profileDirty: 0, rev, syncedAt: Date.now(),
  }
  commit({ ...state, players: [...state.players, player], current: player.localId })
}

/** Tests only: forget everything. */
export const resetForTests = () => commit(EMPTY)
