// The offline app. On install it keeps every file of the build (Vite's asset-manifest.json lists them), so the app opens with no network.
// Pages are network first, falling back to the kept app; built files and fonts are cache first. /api and /content are the app's own business
// (sync.js retries; content.js keeps packs in its own cache).
const CACHE = 'onepercent-app-v1'
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const files = new Set(['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-180.png'])
    const manifest = await (await fetch('/asset-manifest.json', { cache: 'no-cache' })).json()
    for (const chunk of Object.values(manifest)) {
      files.add(`/${chunk.file}`)
      for (const f of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) files.add(`/${f}`)
    }
    const cache = await caches.open(CACHE)
    await cache.addAll([...files])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('onepercent-app-') && key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET') return
  if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/content/'))) return
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/')) ?? Response.error()))
    return
  }
  event.respondWith((async () => {
    const hit = await caches.match(request)
    if (hit) return hit
    const res = await fetch(request)
    // Opaque: a cross-origin font. A new build's files arrive here too, the first time they are used.
    if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(request, res.clone())
    return res
  })())
})
