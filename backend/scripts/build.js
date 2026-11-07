// @ts-check
// Bundles the API Lambda into dist/api.mjs with esbuild, so a synth needs no Docker.
// The AWS SDK goes inside the bundle, so the code doesn't depend on the runtime's SDK version.
import { build } from 'esbuild'

await build({
  entryPoints: { api: 'src/handler.js' },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  // lambda-api and OneTable are CommonJS and call require, which an ES module lacks.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  // lambda-api imports it only for its S3 file sending, which OnePercent doesn't use. The Lambda runtime has it anyway.
  external: ['@aws-sdk/client-s3'],
  logLevel: 'warning',
})
