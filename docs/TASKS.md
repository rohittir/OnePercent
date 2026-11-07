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

## M7 Owner feedback of 6 November 2026 ✓

| Task | Does | Check |
| --- | --- | --- |
| OP-M7-01 ✓ | Delete in Settings did nothing: `window.confirm` returns false at once in in-app browsers, and any API error stopped the local delete. Now the page asks, the player leaves the device at once, and the online copy is queued for the sync. "Stop playing" no longer asks. | Vitest (App, store, sync) |
| OP-M7-02 ✓ | Unlimited retries: every game on Home is a link to play it again, at any time; each play merges into the day (best score, highest level passed) | Vitest; J1 |
| OP-M7-03 ✓ | A pass (80%+) unlocks the next level at once; a level is one above the highest passed and never falls. Results become `{ skill, best, top, playedAt }`; the old shape is read as the new one. | `npm test -w shared`; `npm run test:int`; J1, J3 |
| OP-M7-04 ✓ | Smooth rounds: one answer per round, the timer stops on it, ✓ or ✗ on the tapped item, the right answer shown after a miss, the card slides out and the next slides in, and the timer starts once it settles. A miss moves on by itself after 1.6 s (owner's choice). | Vitest (games); J1 to J3 |

## M8 New games and Watch me first ✓ (7 November 2026)

| Task | Does | Check |
| --- | --- | --- |
| OP-M8-01 ✓ | Skills `switch`, `stop`, `plan`; the daily mix of 4 (rotation, weakest skill in); start levels filled in for players made before | `npm test -w shared` |
| OP-M8-02 ✓ | Sort Switch, Firefly Catch, Route Planner, Pattern Grid as plug-ins, from `design/new-games.html` | Vitest (games) |
| OP-M8-03 ✓ | Watch me first: the demo round, the ghost hand, `demoNext()` in every game; "Skip the demo" and "Show me how" | Vitest (App); J5 |
| OP-M8-04 ✓ | Home: "More games" for the games outside today's set | Vitest (App); J5 |
