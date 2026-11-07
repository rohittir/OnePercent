# OnePercent tasks

The build plan for `docs/ARCHITECTURE.md`. Work in order; each task ends with a check. Every rule gets one runnable test. ✓ marks a done task.

## M0 Foundation ✓ (6 November 2026)

| Task | Does | Check |
| --- | --- | --- |
| OP-M0-01 ✓ | Git repo, npm workspaces (`shared`, `web`, `e2e`), `backend/` as its own package, Node 24, ESLint, `.gitignore` | `npm ci && npm run lint` |
| OP-M0-02 ✓ | `shared/`: `nextLevel`, `starsFor`, `startLevels`, the skills and the age bands. The puzzle rules belong to their games (OP-M1-02). | `npm test -w shared` |
| OP-M0-03 ✓ | Backend skeleton: `lambda-api` handler, `dynamodb-onetable` schema of Player and Day, DynamoDB Local on port 8100, local server on port 4100, `GET /api/v1/health` | `npm run stack:up && npm run dev`; `npm run test:int` |
| OP-M0-04 ✓ | CDK skeleton: data stack and app stack, `stages.js` | `npm run synth` with no AWS account |

## M1 The app on one device ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M1-01 ✓ | Vite and React shell, routes, the `percy` and `galaxy` themes from the prototype, sound | Vitest renders the screens in both themes |
| OP-M1-02 ✓ | Game contract and registry; Echo, Odd One Out, What's Next and Same or Not as plug-ins | Vitest plays a round of each |
| OP-M1-03 ✓ | Local store with several players: Who's playing, New player with PIN, Home, Day done, Settings | Vitest for the store |
| OP-M1-04 ✓ | `progress` (levels, stars, streak from days) and `pickToday` in `shared/` | `npm test -w shared` |
| OP-M1-05 ✓ | Journey J1: a new player plays a day with no backend | `npm run e2e -- j1` |

## M2 Sync ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M2-01 ✓ | Player API: create, claim, lockout, token check | `npm run test:int` |
| OP-M2-02 ✓ | Merge rules in `shared/` and the sync route, with the rev transaction | Convergence tests in shared; two devices at once in `test:int` |
| OP-M2-03 ✓ | Client sync loop: on open, after a change, every 5 minutes, on hide and on reconnect; backoff; the "Saved" status | Vitest with a fake API |
| OP-M2-04 ✓ | Journey J3: two devices play the same game and converge | `npm run e2e -- j3` |

## M3 Another device ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M3-01 ✓ | "Play on another device": the ID, a QR code of the join link, and the PIN shown on tap | Journey J2 |
| OP-M3-02 ✓ | Join: type the ID and PIN, or open a QR link; the player is added to this device | Journey J2 |
| OP-M3-03 ✓ | Change PIN; delete a player from the device and the server | `npm run test:int` |

## M4 Content packs ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M4-01 ✓ | The `pairs` pack schema; the starter pack bundled and in `content/` | `npm test -w shared` |
| OP-M4-02 ✓ | The content bucket and `/content/*` behaviour; `npm run content:publish` (check, hash, manifest, upload); Vite serves `content/` locally | `node --test "tools/*.test.js"`. The upload itself waits for a deployed stage. |
| OP-M4-03 ✓ | Client loader with the Cache API; `pickToday` rotation when a skill has several games | Vitest; `npm test -w shared` |

## M5 Install and offline ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M5-01 ✓ | Web app manifest, icons and service worker: the app installs to the home screen and opens offline | Journey J4 with the network off (Lighthouse no longer has a PWA check) |

## M6 Deploy

| Task | Does | Check |
| --- | --- | --- |
| OP-M6-01 | Owner: AWS account, region, domain and certificate, the CDK bootstrap ✓ (6 November 2026: prod in us-east-1 with the owner's domain). The domain's CNAME at its DNS host ✓. Still open: the GitHub OIDC role and environments for the Deploy workflow (`docs/RUNBOOK.md`). | Owner confirms |
| OP-M6-02 ✓ | The web bucket and the CloudFront distribution (`/api/*`, `/content/*`, the CSP); GitHub Actions CI and the manual deploy workflow; the runbook | `npm run synth`. Prod deployed from the owner's machine on 6 November 2026; the starter pack published; a create, claim, sync and delete round trip passed through CloudFront and was cleaned up. |
