// @ts-check
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { Manifest } from '../shared/schemas.js'
import { buildContent } from './content.js'

const pack = { id: 'letters', title: 'Letters', type: 'pairs', ages: [9, 14], items: [{ a: 'b', b: 'd', level: 0 }] }

/** @param {Record<string, unknown>} files path under content/ → JSON */
function contentDir(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'onepercent-content-'))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    writeFileSync(path.join(dir, name), JSON.stringify(body))
  }
  return dir
}

test('the repo content builds: a valid manifest, packs named by hash', () => {
  const { manifest, files } = buildContent()
  assert.ok(Manifest.safeParse(manifest).success)
  assert.ok(manifest.packs.some((p) => p.type === 'pairs' && p.id === 'starter'))
  for (const { url } of manifest.packs) assert.ok(files.has(url.replace('/content/', '')), url)
  assert.match(manifest.packs[0].url, /^\/content\/packs\/pairs\.starter\.[0-9a-f]{12}\.json$/)
})

test('a new version gets a new name; the same content keeps it', () => {
  const one = buildContent(contentDir({ 'pairs/letters.json': pack })).manifest.packs[0].url
  const same = buildContent(contentDir({ 'pairs/letters.json': pack })).manifest.packs[0].url
  const changed = buildContent(contentDir({ 'pairs/letters.json': { ...pack, title: 'More letters' } })).manifest.packs[0].url
  assert.equal(one, same)
  assert.notEqual(one, changed)
})

test('a bad pack stops the build and says which file and why', () => {
  assert.throws(() => buildContent(contentDir({ 'pairs/bad.json': { ...pack, items: [{ a: 'b', b: 'b', level: 0 }] } })), /content\/pairs\/bad\.json: .*two different symbols/)
  assert.throws(() => buildContent(contentDir({ 'words/letters.json': pack })), /belongs in content\/pairs\//)
  assert.throws(() => buildContent(contentDir({ 'pairs/a.json': pack, 'pairs/b.json': pack })), /a second pack with id "letters"/)
})
