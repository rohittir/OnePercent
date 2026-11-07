// @ts-check
// Renders web/public/icon.svg into the PNG icons that installs need. Run after changing the SVG: node e2e/make-icons.js
// (It lives here because Playwright does.)
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const pub = path.resolve(import.meta.dirname, '../web/public')
const svg = readFileSync(path.join(pub, 'icon.svg'), 'utf8')
const browser = await chromium.launch()
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0"><img style="width:${size}px;height:${size}px;display:block" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`)
  await page.screenshot({ path: path.join(pub, `icon-${size}.png`), omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons written to web/public')
