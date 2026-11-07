// @ts-check
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buildContent } from '../tools/content.js'
import { CSP } from './csp.js'

/**
 * Serves content/ at /content/ in dev and preview, built as `npm run content:publish` builds it, so a pack edit shows on reload.
 * @returns {import('vite').Plugin}
 */
function contentServer() {
  /** @param {import('vite').ViteDevServer | import('vite').PreviewServer} server */
  // Returns nothing: Vite would call a returned function as a post hook.
  const serve = (server) => {
    server.middlewares.use('/content', (req, res, next) => {
      const body = buildContent().files.get((req.url ?? '').slice(1).split('?')[0])
      if (!body) return next()
      res.setHeader('content-type', 'application/json')
      res.end(body)
    })
  }
  return { name: 'onepercent-content', configureServer: serve, configurePreviewServer: serve }
}

// The API runs on 4100 (backend/.env.example). Ports differ from EHub's so both can run at once.
const proxy = { '/api': 'http://127.0.0.1:4100' }

export default defineConfig({
  plugins: [react(), contentServer()],
  server: { port: 5180, strictPort: true, proxy, fs: { allow: ['..'] } },
  // The built app runs under the CSP that CloudFront sends.
  preview: { port: 5181, strictPort: true, proxy, headers: { 'Content-Security-Policy': CSP } },
  // public/sw.js reads this list to keep the app for offline use.
  build: { manifest: 'asset-manifest.json' },
  test: { environment: 'jsdom', include: ['src/**/*.test.{js,jsx}'] },
})
