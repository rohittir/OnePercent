// @ts-check
// Checks every pack in content/, builds them into dist-content/, and uploads them when CONTENT_BUCKET is set:
//   CONTENT_BUCKET=<the stack's ContentBucketName output> npm run content:publish
// Uses the AWS CLI with the credentials already on this machine. No app release is needed (docs/RUNBOOK.md).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildContent } from './content.js'

const out = path.resolve(import.meta.dirname, '../dist-content')
const { manifest, files } = buildContent()
rmSync(out, { recursive: true, force: true })
for (const [key, body] of files) {
  mkdirSync(path.dirname(path.join(out, key)), { recursive: true })
  writeFileSync(path.join(out, key), body)
}
console.log(`${manifest.packs.length} pack(s) checked: ${manifest.packs.map((p) => `${p.type}/${p.id}`).join(', ')}`)

const bucket = process.env.CONTENT_BUCKET
if (!bucket) {
  console.log('Built in dist-content/. Set CONTENT_BUCKET to upload.')
} else {
  const aws = (/** @type {string[]} */ ...args) => execFileSync('aws', ['s3', ...args, '--content-type', 'application/json'], { stdio: 'inherit' })
  // Packs first, cached for a year (a new version has a new name), then the manifest that points at them, cached for a minute.
  aws('cp', path.join(out, 'packs'), `s3://${bucket}/content/packs/`, '--recursive', '--cache-control', 'public, max-age=31536000, immutable')
  aws('cp', path.join(out, 'manifest.json'), `s3://${bucket}/content/manifest.json`, '--cache-control', 'public, max-age=60')
  console.log('Published. Apps pick the packs up on their next open.')
}
