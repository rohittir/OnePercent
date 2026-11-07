// @ts-check
import { afterEach, expect, test, vi } from 'vitest'
import { contentFor, loadContent } from './content.js'

afterEach(() => vi.unstubAllGlobals())

const newStarter = { id: 'starter', title: 'Starter v2', type: 'pairs', ages: [7, 14], items: [{ a: 'x', b: 'y', level: 0 }] }
const older = { id: 'letters', title: 'Letters', type: 'pairs', ages: [11, 14], items: [{ a: 'b', b: 'd', level: 0 }] }
const manifest = { packs: [
  { id: 'starter', type: 'pairs', ages: [7, 14], url: '/content/packs/pairs.starter.aaa.json' },
  { id: 'letters', type: 'pairs', ages: [11, 14], url: '/content/packs/pairs.letters.bbb.json' },
] }

test('published packs replace bundled ones of the same id, are kept in the cache, and fit by age', async () => {
  const store = new Map()
  vi.stubGlobal('caches', { open: async () => ({
    match: async (/** @type {string} */ url) => store.get(url)?.clone(),
    put: async (/** @type {string} */ url, /** @type {Response} */ res) => { store.set(url, res) },
    keys: async () => [],
    delete: async () => true,
  }) })
  const fetched = vi.fn(async (/** @type {string} */ url) => new Response(JSON.stringify(
    url.endsWith('manifest.json') ? manifest : url.includes('starter') ? newStarter : older)))
  vi.stubGlobal('fetch', fetched)

  expect(contentFor('pairs', 8).some((i) => i.a === '🍎')).toBe(true) // bundled before any load
  await loadContent()
  expect(contentFor('pairs', 8)).toEqual([{ a: 'x', b: 'y', level: 0 }])
  expect(contentFor('pairs', 12)).toHaveLength(2)
  expect(store.size).toBe(2)

  // Offline: the last manifest and the cached packs still load.
  fetched.mockImplementation(async () => { throw new TypeError('offline') })
  await loadContent()
  expect(contentFor('pairs', 12)).toHaveLength(2)
})
