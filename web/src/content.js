// @ts-check
// Content packs (docs/ARCHITECTURE.md, "Content packs"): the bundled starter packs, plus the published ones,
// kept in the Cache API so they work offline. A published pack replaces a bundled one with the same type and id.
import { Manifest, Pack } from '@onepercent/shared/schemas.js'
import starterPairs from '../../content/pairs/starter.json'

const CACHE = 'onepercent-content'
const MANIFEST_KEY = 'onepercent:manifest'
/** @typedef {import('zod').infer<typeof Pack>} PackT */

/** @type {PackT[]} */
const BUNDLED = [/** @type {PackT} */ (starterPairs)]
/** @type {PackT[]} */
let packs = BUNDLED

/** Fetches the manifest and any new packs. Offline, it uses the last manifest and the cached packs. Never throws. */
export async function loadContent() {
  try {
    const cache = await caches.open(CACHE)
    let manifest
    try {
      const res = await fetch('/content/manifest.json', { cache: 'no-cache' })
      manifest = Manifest.parse(await res.json())
      localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest))
    } catch {
      manifest = Manifest.safeParse(JSON.parse(localStorage.getItem(MANIFEST_KEY) ?? 'null')).data
    }
    if (!manifest) return
    /** @type {PackT[]} */
    const loaded = []
    for (const { url } of manifest.packs) {
      let res = await cache.match(url)
      if (!res) {
        res = await fetch(url).catch(() => undefined)
        if (!res?.ok) continue
        await cache.put(url, res.clone())
      }
      const pack = Pack.safeParse(await res.json())
      if (pack.success) loaded.push(pack.data)
    }
    packs = [...loaded, ...BUNDLED.filter((b) => !loaded.some((l) => l.type === b.type && l.id === b.id))]
    // Packs that left the manifest leave the cache.
    const keep = new Set(manifest.packs.map((p) => new URL(p.url, location.origin).href))
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req)
  } catch {
    // shortcut: no Cache API (an old browser or a test) leaves the bundled packs; the next open tries again.
  }
}

/**
 * @param {string} type
 * @param {number} age
 * @returns {any[]} the items of every pack of the type that fits the age
 */
export const contentFor = (type, age) => packs.filter((p) => p.type === type && age >= p.ages[0] && age <= p.ages[1]).flatMap((p) => p.items)
