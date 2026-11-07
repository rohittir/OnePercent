# OnePercent architecture

Status: plan, 6 November 2026. Nothing below is built yet. The single-file prototype `index.html` is the reference for the look, the four games and the level rules.

## Summary

OnePercent is a web app of short daily brain games for children. Each skill has a level, and a good day makes that skill's games about 1% harder the next day. There are no accounts. A device keeps each child's progress in localStorage and syncs it to an AWS serverless backend. A child moves to another device with a word ID and a PIN, or by scanning a QR code. Games ship in code releases, and their content is uploaded by the developer apart from a release.

## Stack

The model is EHub-Serverless (`~/Documents/projects/CIS/EHub-Serverless`).

| Part | Choice |
| --- | --- |
| Language | Plain JavaScript, ES modules, JSDoc and `// @ts-check`. Node 24. |
| Web | React with Vite and React Router. Plain CSS with theme tokens. No UI kit. |
| Shared code | `@onepercent/shared`: zod schemas and pure rules that the web app and the backend both use |
| API | One Lambda behind an API Gateway HTTP API, routed by `lambda-api` |
| Data | One DynamoDB table through `dynamodb-onetable` |
| Content | JSON packs in S3, served by CloudFront |
| Web hosting | S3 and CloudFront. CloudFront sends `/api/*` to the HTTP API and `/content/*` to the content bucket, so the app has one origin and no CORS. |
| Infrastructure | AWS CDK in `backend/infra`, stages `dev` and `prod` |
| Local run | DynamoDB Local in Docker, the API as a local Node server, Vite for the web app. No AWS account is needed to build or test. |
| Tests | `node:test` for shared and backend, Vitest for web, Playwright for journeys |

## Repository layout

| Path | Holds |
| --- | --- |
| `web/` | The React app: screens, themes, the game registry and the games |
| `web/src/games/<gameId>/` | One game: its rules and its round screen |
| `web/src/themes/<band>/` | One age band's theme: tokens, buddy, words |
| `shared/` | Schemas, level and merge rules, age bands, word lists for IDs |
| `backend/` | Lambda source, CDK, jobs, tests. Its own `package.json`, not a workspace (as in EHub). |
| `content/<gameId>/` | Content packs as JSON, checked by the game's schema |
| `e2e/` | Playwright journeys against the local stack |
| `docs/` | This file and `TASKS.md` |

## Players and devices

### The player ID

- A word ID: `adjective-animal-NN`, for example `brave-otter-27`. Lists of 128 kid-safe adjectives and 128 animals give about 1.6 million IDs.
- The server picks it when the player is first synced, with a conditional put, and retries on a clash.
- A player made offline plays at once with no ID. The ID appears after the first sync.

### PIN and device tokens

- The child picks a 4-digit PIN at setup. The server keeps only its scrypt hash and salt.
- Creating a player, or claiming one with ID and PIN, returns a device token: 32 random bytes. The server keeps only its SHA-256 hash, up to 10 per player (the oldest drops).
- Sync calls carry the token. The PIN is never sent again after setup or claim.
- After 5 wrong PINs a player is locked for 15 minutes. An unknown ID and a wrong PIN get the same answer in the same time, so IDs can't be discovered.

### Moving to another device

- **By QR:** the "Play on another device" screen shows a QR code of `https://<host>/join#brave-otter-27.4821`. The phone's own camera opens it, so the app needs no scanner. The ID and PIN are in the fragment, which never reaches the server or its logs.
- **By typing:** the Join screen asks for the ID and the PIN.
- Both paths call the same claim route. Afterwards both devices stay active and in sync.

### Several players on one device

- localStorage holds a list of players. The app opens on "Who's playing?", which shows each child's buddy and name, plus "Add a player" and "Join from another device".
- Each player has their own ID, PIN, token and progress.

## Local-first data and sync

### What a device keeps

```
onepercent:v1 = {
  players: [{
    localId, code, token,          // code and token are null until the first sync
    name, age, startLevels, muted, updatedAt,
    days: { '2026-11-06': { echo: { score, level, rounds, playedAt }, ... } },
    dirtyDays: ['2026-11-06'], rev
  }],
  lastPlayer: localId
}
```

### Derived, never stored

Levels, stars, streak and days played come from `days` by one pure function in `shared/` that replays the days in date order with `nextLevel`. Two devices that hold the same days therefore show the same levels. `startLevels` is fixed when the player is made, so changing the age later doesn't rewrite the past.

### Merge rules

| Data | Rule |
| --- | --- |
| A game's result on a date | Keep the higher score. On a tie, keep the earlier `playedAt`. |
| Name, age, muted | The later `updatedAt` wins |
| The day lock | A day is done when every game of that day's set has a result |

The rules are commutative, so devices converge whatever order they sync in.

### When a device syncs

- On open, after each finished day, every 5 minutes while open, and when the page is hidden.
- It sends the profile and the dirty days, and receives every day with a `rev` above its own.
- Offline, the dirty days wait. A failed sync retries with backoff, and play never waits for the network.

## Data model

One table, keys `pk` and `sk`. No secondary index is needed. Only `backend/src/data/schema.js` spells a key.

| Item | pk | sk | Attributes |
| --- | --- | --- | --- |
| Player | `PLAYER#<code>` | `PROFILE` | name, age, startLevels, muted, updatedAt, pinHash, pinSalt, tokenHashes, failedPins, lockedUntil, rev, createdAt |
| Day | `PLAYER#<code>` | `DAY#<YYYY-MM-DD>` | results by game id, rev |

`rev` is a counter on the player item, raised by each sync that writes. Every day written in that sync gets the new value.

## API

All routes are under `/api/v1`. Bodies are checked with the zod schemas of `shared/`.

| Route | Auth | Does |
| --- | --- | --- |
| `POST /players` | none | Makes a player from name, age, PIN and any days already played. Returns code, token and profile. |
| `POST /players/claim` | none | Takes code and PIN. Returns a token, the profile and all days. 401 for a wrong pair, 429 while locked. |
| `POST /players/{code}/sync` | token | Takes the profile, the dirty days and `since`. Merges them, then returns the profile, the days with `rev` above `since`, and the new `rev`. |
| `PUT /players/{code}/pin` | token | Changes the PIN |
| `DELETE /players/{code}` | token | Deletes the player and all their days |
| `GET /health` | none | Liveness |

A response never carries the PIN hash, its salt or token hashes.

## Games and content

### A game

A game is a folder in `web/src/games/` that exports:

| Field | Meaning |
| --- | --- |
| `id`, `name`, `icon`, `how` | Identity and the one-line instructions |
| `skill` | One of `memory`, `focus`, `logic`, `speed`. Levels belong to skills, so a new game starts at the child's level for that skill. |
| `ages` | The ages it suits, for example `[7, 14]` |
| `rounds` | Rounds per session |
| `difficulty(level)` | Turns a level into the game's settings (sequence length, grid size, time limit) |
| `contentSchema` | The zod schema of its packs, if it uses content |
| `Round` | The React component of one round. It gets the settings, the content and `say`, and calls `onDone(true or false)`. |

`web/src/games/index.js` lists the games. The app shell, sync, themes and the day flow don't change when a game is added.

### Today's set

`pickToday(player, date, games)` in `shared/` picks one game per skill from the games whose `ages` fit the child. When a skill has several games, the pick rotates by date. With today's four games it always picks the same four.

### Age bands and themes

`shared/bands.js` lists the bands: `percy` for ages 7–10 and `galaxy` for 11–14. A new band is a new entry plus a folder in `web/src/themes/`, holding the colour tokens, the buddy (Percy, or the rocket) and the words of the screens.

### Content packs

- Packs are JSON in `content/<gameId>/`. Examples: look-alike pairs, number-rule sets, and later word lists or pictures.
- `npm run content:publish` checks each pack against its game's schema, names each file by its hash, writes `manifest.json` and uploads both to the content bucket. The files are cached for a year and the manifest for one minute. No app release is needed.
- On open, the app fetches the manifest, downloads new packs and keeps them in the Cache API, so they work offline.
- Each game also ships a default pack in its code, so a first launch works offline.

## Web app

| Screen | Route |
| --- | --- |
| Who's playing? | `/` |
| New player: name, age, PIN | `/new` |
| Home: today's games in the band's theme | `/play` |
| Game intro and rounds | `/play/:gameId` |
| Day done | `/done` |
| Play on another device: ID, QR, PIN | `/move` |
| Join from another device | `/join` (QR links land here with a fragment) |
| Settings: sound, change PIN, delete player | `/settings` |

The layout is phone first, then iPad (two columns), then desktop (iPad layout, centred), as in the prototype.

## Infrastructure

| Stack | Holds |
| --- | --- |
| Data | The table (pay per request, point-in-time recovery on prod) and the content bucket |
| App | The API Lambda and its alias, the HTTP API with a throttle, the web bucket, and the CloudFront distribution: SPA rewrite, security headers, `/api/*` and `/content/*` behaviours, and an origin secret header so the API answers only through CloudFront |

`backend/infra/lib/stages.js` holds every difference between `dev` and `prod`, as in EHub.

## Security and privacy

- Only a nickname or first name and an age are stored. No email, no photo, no tracking.
- Unknown ID and wrong PIN answer alike; PINs lock after 5 tries; tokens and PINs are stored hashed.
- A child or parent can delete a player, which removes it from the device and the server.

## Testing

| Layer | What |
| --- | --- |
| shared | Level replay, merge convergence (any order, any duplicates), `pickToday`, ID words, sequence and pair rules |
| backend | Create, claim, lockout, sync merge and token checks against DynamoDB Local |
| web | Each game's round, the store and the sync loop with a fake API |
| e2e | J1: a new player plays a day offline. J2: a second device joins by ID and PIN and sees the progress. J3: two devices play the same day and converge. |

## Risks and open items

| Item | Note |
| --- | --- |
| Children's data law | Even a nickname, age and scores may count as a child's personal data (India's DPDP Act, COPPA in the US). The owner should confirm the consent need before a public launch. |
| AWS account, region, domain | Needed only to deploy. The default is `ap-south-1`, as in EHub. |
| iPhone home-screen app | A QR link opens Safari, whose storage differs from an installed home-screen app. There, a child joins by typing the ID and PIN. |
| PIN strength | 10,000 PINs. The lockout limits online guessing. A leaked table could be brute-forced offline, which is accepted for this data. |
| Clocks | Profile edits use the device clock for "later wins". A wrong clock can lose a name or age edit, never a game result. |
