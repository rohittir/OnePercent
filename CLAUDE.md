# OnePercent

OnePercent is a web app of short daily brain games for children aged 7 to 14. Each skill has a level, and every good day makes that skill's games about 1% harder. Ages 7–10 see the Percy and pals theme; ages 11–14 see Brain galaxy.

## Status

6 November 2026: M0 to M6 of `docs/TASKS.md` are built: the React app with both themes and four games, local-first sync to the Lambda and DynamoDB backend, moving devices by word ID and PIN or QR, content packs, the offline app, CloudFront and the CI and deploy workflows. Prod was deployed to us-east-1 from the owner's machine on 6 November 2026, with the owner's custom domain and its existing certificate (the values live in the deploy command's environment, never in a file). The domain's CNAME at its DNS host is in place. Open in OP-M6-01: the GitHub OIDC role for the Deploy workflow (`docs/RUNBOOK.md`). The prototype `index.html` and `design/concepts.html` stay as references.

Local run: `npm ci` at the root and in `backend/`, then `npm run stack:up` (DynamoDB Local on port 8100), `npm run dev` (the API on port 4100) and `npm run dev:web` (http://localhost:5180). Checks: `npm run lint`, `npm test`, `npm run test:int` and `npm run e2e` (both need the stack), `npm run synth`.

## Where things are

| Path | Holds |
| --- | --- |
| `docs/ARCHITECTURE.md` | The design: stack, players and devices, sync, data model, API, games and content |
| `docs/TASKS.md` | The ordered build plan, `OP-M0` to `OP-M6`. The first unticked task is next. |
| `docs/RUNBOOK.md` | Run locally, deploy, publish content, roll back, remove a stage |
| `web/` | The React app: `src/screens/`, `src/games/<id>/` (one folder per game, listed in `src/games/index.js`), `src/themes/<band>/`, the store and the sync loop |
| `shared/` | `@onepercent/shared`: schemas, level, progress and merge rules, today's set, age bands, ID words. Used by the web app and the backend. |
| `backend/` | The API Lambda (`src/`), its key schema (`src/data/schema.js`), the CDK app (`infra/`), DynamoDB Local (`compose.yaml`). Its own `package.json`, not a workspace. |
| `content/<type>/` | Content packs; `npm run content:publish` checks and uploads them |
| `e2e/` | Playwright journeys J1 to J4 |
| `index.html` | The prototype. Open `index.html?test` for its self-check. |
| `design/concepts.html` | The three design directions; A and B were chosen |

## Decisions that are fixed

The owner made these on 6 November 2026. Don't reopen them.

| Decision | Detail |
| --- | --- |
| Model | Follow EHub-Serverless: plain JavaScript with JSDoc, React and Vite, a `shared/` package, `lambda-api`, one DynamoDB table through `dynamodb-onetable`, AWS CDK |
| Backend | API Gateway HTTP API, Lambda, DynamoDB single table |
| No accounts | Progress lives in localStorage and syncs to the backend regularly |
| Identity | Each player gets a word ID such as `brave-otter-27` and a 4-digit PIN. A new device joins by QR code or by typing the ID and PIN. |
| Devices | All of a player's devices stay active and in sync. On the same day, the best result of each game counts. |
| Players per device | Several; the app opens on "Who's playing?" |
| Themes | Percy and pals for ages up to 10, Brain galaxy above 10 |
| Content | New games ship in code releases. Their content is uploaded by the developer apart from a release. |
| Layout | Phone first, iPad second, desktop last |

## Rules that are easy to get wrong

1. Levels, stars and streaks are derived from the days played, never stored as truth.
2. Merge rules must give the same result in any order: the best score per game per day, and the later edit for profile fields.
3. An unknown ID and a wrong PIN get the same answer. No response carries a PIN hash, a salt or a token hash.
4. Only `backend/src/data/schema.js` spells a key.
5. A game never imports another game, the store or the sync code. It gets its settings and content through its props.
6. Nothing needs an AWS account to build or test.
7. Every pack type has its schema in `shared/schemas.js`; the publish script refuses a pack that fails it.

## Working agreements

- Build the smallest thing that works, and leave one runnable test for every rule.
- Commit only when the owner asks.
- Documents use short plain sentences and tables.
