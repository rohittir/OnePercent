# OnePercent tasks

The build plan for `docs/ARCHITECTURE.md`. Work in order; each task ends with a check. Every rule gets one runnable test. ✓ marks a done task.

## M0 Foundation ✓ (6 November 2026)

| Task | Does | Check |
| --- | --- | --- |
| OP-M0-01 ✓ | Git repo, npm workspaces, `backend/` as its own package, Node 24, ESLint, `.gitignore`. `shared` is the only workspace so far; `web` and `e2e` join when M1 makes them. | `npm ci && npm run lint` |
| OP-M0-02 ✓ | `shared/`: `nextLevel`, `starsFor`, `startLevels`, the skills and the age bands. The puzzle rules (`makeSequence`, `choices`, pairs) belong to their games and move with them in OP-M1-02. | `npm test -w shared` |
| OP-M0-03 ✓ | Backend skeleton: `lambda-api` handler, `dynamodb-onetable` schema of Player and Day, Docker Compose with DynamoDB Local on port 8100, local server on port 4100, `GET /api/v1/health` | `npm run stack:up && npm run dev`, then health answers 200; `npm run test:int` |
| OP-M0-04 ✓ | CDK skeleton: data stack (the table) and app stack (the Lambda and the HTTP API with a throttle), `stages.js` | `npm run synth` with no AWS account |

## M1 The app on one device

| Task | Does | Check |
| --- | --- | --- |
| OP-M1-01 | Vite and React shell, routes, the `percy` and `galaxy` themes from the prototype, sound | Vitest renders each screen in both themes |
| OP-M1-02 | Game contract and registry; port Echo, Odd One Out, What's Next and Same or Not | Vitest plays a round of each |
| OP-M1-03 | Local store with several players: Who's playing, New player with PIN, Home, Day done, Settings | Vitest for the store |
| OP-M1-04 | `deriveProgress` (levels, stars, streak from days) and `pickToday` in `shared/` | `npm test -w shared` |
| OP-M1-05 | Journey J1: a new player plays a day with no backend | `npm run e2e -- j1` |

## M2 Sync

| Task | Does | Check |
| --- | --- | --- |
| OP-M2-01 | Player API: create, claim, lockout, token check | Backend tests on DynamoDB Local |
| OP-M2-02 | Merge rules in `shared/` and the sync route | Convergence test: any order, duplicates, two devices |
| OP-M2-03 | Client sync loop: on open, after a day, every 5 minutes, on hide; backoff; a small "saved" status | Vitest with a fake API |
| OP-M2-04 | Journey J3: two devices play the same day and converge | `npm run e2e -- j3` |

## M3 Another device

| Task | Does | Check |
| --- | --- | --- |
| OP-M3-01 | "Play on another device": the ID, a QR code of the join link, and the PIN shown on tap | Vitest |
| OP-M3-02 | Join: type the ID and PIN, or open a QR link; the player is added to this device | Journey J2 |
| OP-M3-03 | Change PIN; delete a player from the device and the server | Backend and Vitest tests |

## M4 Content packs

| Task | Does | Check |
| --- | --- | --- |
| OP-M4-01 | Pack schemas per game and bundled default packs | `npm test -w shared` |
| OP-M4-02 | The content bucket in the data stack; `npm run content:publish`: validate, hash, manifest, upload; local serving of `content/` | Script test against a local S3-compatible server |
| OP-M4-03 | Client loader with the Cache API; `pickToday` rotation when a skill has several games | Vitest |

## M5 Install and offline

| Task | Does | Check |
| --- | --- | --- |
| OP-M5-01 | Web app manifest and service worker: the app and its packs work offline and install to the home screen | Lighthouse PWA check; J1 with the network off |

## M6 Deploy

| Task | Does | Check |
| --- | --- | --- |
| OP-M6-01 | Owner: AWS account, region, domain and certificate | Owner confirms |
| OP-M6-02 | The web bucket and the CloudFront distribution (`/api/*`, `/content/*`, origin secret); GitHub Actions CI and deploy with an OIDC role; runbook | A deploy to `dev`, then J2 against it |
