// @ts-check
// Builds the content packs of content/<type>/*.json into what the content bucket serves:
// manifest.json, and each pack named by its hash so it can be cached forever. Used by `npm run content:publish` and the dev server.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { Pack } from '../shared/schemas.js'

export const CONTENT_DIR = path.resolve(import.meta.dirname, '../content')

/**
 * @param {string} [dir] the folder of content/<type>/*.json
 * @returns {{ manifest: { packs: { id: string, type: string, ages: [number, number], url: string }[] }, files: Map<string, string> }}
 *   files: the bucket's keys under content/ and their bodies. Throws on a pack that fails its schema or sits in the wrong folder.
 */
export function buildContent(dir = CONTENT_DIR) {
  const files = new Map()
  const packs = []
  for (const type of readdirSync(dir).sort()) {
    if (type.startsWith('.')) continue
    for (const name of readdirSync(path.join(dir, type)).filter((f) => f.endsWith('.json')).sort()) {
      const where = `content/${type}/${name}`
      const parsed = Pack.safeParse(JSON.parse(readFileSync(path.join(dir, type, name), 'utf8')))
      if (!parsed.success) throw new Error(`${where}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
      const pack = parsed.data
      if (pack.type !== type) throw new Error(`${where}: type "${pack.type}" belongs in content/${pack.type}/`)
      if (packs.some((p) => p.type === type && p.id === pack.id)) throw new Error(`${where}: a second pack with id "${pack.id}"`)
      const body = JSON.stringify(pack)
      const key = `packs/${type}.${pack.id}.${createHash('sha256').update(body).digest('hex').slice(0, 12)}.json`
      files.set(key, body)
      packs.push({ id: pack.id, type, ages: pack.ages, url: `/content/${key}` })
    }
  }
  const manifest = { packs }
  files.set('manifest.json', JSON.stringify(manifest))
  return { manifest, files }
}
