# OnePercent architecture

Status: built, 6 November 2026 (M0 to M6 of `docs/TASKS.md`; the first deploy waits for the owner's AWS account). The single-file prototype `index.html` stays as the reference for the look.

## Summary

OnePercent is a web app of short daily brain games for children. Each skill has a level; passing a game at 80% or more unlocks its next level, about 1% harder, at once. Retries have no limit. There are no accounts. A device keeps each child's progress in localStorage and syncs it to an AWS serverless backend. A child moves to another device with a word ID and a PIN, or by scanning a QR code. Games ship in code releases, and their content is uploaded by the developer apart from a release.

## Stack

The model is EHub-Serverless (`~/Documents/projects/CIS/EHub-Serverless`).

| Part | Choice |
| --- | --- |
| Language | Plain JavaScript, ES modules, JSDoc and `// @ts-check`. Node 24. |
| Web | React with Vite and React Router. Plain CSS with theme tokens. No UI kit. `uqr` draws the QR code. |
| Shared code | `@onepercent/shared`: zod schemas and pure rules that the web app and the backend both use |
| API | One Lambda behind an API Gateway HTTP API, routed by `lambda-api` |
| Data | One DynamoDB table through `dynamodb-onetable`; the sync transaction uses the SDK directly |
| Content | JSON packs in S3, served by CloudFront |
| Web hosting | S3 and CloudFront. CloudFront sends `/api/*` to the HTTP API and `/content/*` to the content bucket, so the app has one origin and no CORS. |
| Offline | A hand-written service worker (`web/public/sw.js`) and a web app manifest; the app installs to the home screen |
| Infrastructure | AWS CDK in `backend/infra`, stages `dev` and `prod` |
| Local run | DynamoDB Local in Docker (port 8100), the API as a local Node server (port 4100), Vite (port 5180). No AWS account is needed to build or test. |
| Tests | `node:test` for shared, tools and backend; Vitest for web; Playwright (pinned to 1.63.0) for journeys |

## Repository layout

| Path | Holds |
| --- | --- |
| `web/src/screens/` | The screens (see "Web app") |
| `web/src/games/<gameId>/` | One game: its rules and its round screen. `web/src/games/index.js` is the registry. |
| `web/src/themes/<band>/` | One age band's theme: `index.jsx` (buddy, words, home and day-done parts) and `theme.css` (tokens) |
| `web/src/store.js`, `sync.js`, `api.js`, `content.js` | The device's players, the sync loop, the API calls, the content packs |
| `web/csp.js` | The Content-Security-Policy, sent by CloudFront and by `vite preview` |
| `shared/` | Schemas, level, progress and merge rules, today's set, age bands, the ID words |
| `backend/src/` | The Lambda: `handler.js`, `players.js` (routes), `data/` (the table), `lib/` |
| `backend/infra/` | The CDK app |
| `content/<type>/<id>.json` | Content packs |
| `tools/` | `content.js` and `content-publish.js` (build and upload packs) |
| `e2e/` | Playwright journeys, and `make-icons.js`, which renders the app icons |
| `docs/` | This file, `TASKS.md`, `RUNBOOK.md` |

## Players and devices

### The player ID

- A word ID: `adjective-animal-NN`, for example `brave-otter-27`. Lists of 128 kid-safe adjectives and 128 animals with 90 numbers give about 1.47 million IDs.
- The server picks it when the player is first synced, with a conditional put, and retries on a clash.
- A player made offline plays at once with no ID. The ID appears after the first sync.
- What a child types is normalized: `Brave Otter 27` is `brave-otter-27`.

### PIN and device tokens

- The child picks a 4-digit PIN at setup. The server keeps only its scrypt hash and salt.
- Creating a player, or claiming one with ID and PIN, returns a device token: 32 random bytes. The server keeps only its SHA-256 hash, up to 10 per player (the oldest drops).
- Sync calls carry the token. The device keeps the PIN too, to show it on "Play on another device".
- After 5 wrong PINs a player is locked for 15 minutes. An unknown ID and a wrong PIN get the same answer after the same scrypt work.

### Moving to another device

- **By QR:** the "Play on another device" screen shows a QR code of `https://<host>/join#brave-otter-27.4821`. The phone's own camera opens it, so the app needs no scanner. The ID and PIN are in the fragment, which never reaches the server or its logs, and the Join screen removes it from the address bar.
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
    localId, code, token, pin,      // code and token are null until the first sync
    name, age, muted, updatedAt, startLevels,
    days: { '2026-11-06': { echo: { skill, best, top, playedAt }, ... } },
    dirty: { '2026-11-06': 2 },     // dates changed since the last sync, with a change counter
    profileDirty, rev, syncedAt, unlinked
  }],
  current: localId,
  deletes: [{ code, token }]        // players deleted here whose online copy is still to go
}
```

A sync clears a dirty date only if its counter did not move while the request was out.

### Results

A day keeps one result per game, over every play of it that day: `best` (the best score, 0 to 1), `top` (the highest level passed that day, -1 for none) and `playedAt` (the latest play). Each play is merged in as it ends, so stopping part-way keeps every finished play. A result of the shape used before 7 November 2026 (one play: `score`, `level`, `rounds`) is read as today's by `normalizeResult`, on the device and on the server.

### Derived, never stored

`progress()` in `shared/progress.js` derives everything from `days`:

| Value | Rule |
| --- | --- |
| A skill's level | One above the highest level passed in it (`top + 1`), or its start level. It rises the moment a game is passed at 80% or more (`PASS` in `shared/levels.js`), never falls, and needs no waiting for tomorrow. |
| Stars | One to three per game per day, for that day's best score |
| Streak, days played | Days with at least one play |
| Growth | 1.01 to the power of the levels passed since day one, over every skill. Percy's sprout and the rocket's distance follow it. |

The level is a maximum, so it does not depend on the order plays arrive in: two devices that hold the same days show the same levels. `startLevels` is fixed when the player is made.

### Merge rules

| Data | Rule |
| --- | --- |
| A game's result on a date | Field by field, the larger: `best`, `top`, `playedAt` |
| Name, age, muted | The later `updatedAt` wins |

The rules are commutative, associative and idempotent, so devices converge whatever order they sync in.

### When a device syncs

- On open, 2 seconds after a change (a new player, a finished game, the sound setting), every 5 minutes, when the page hides, and when the network returns.
- It sends the profile (when changed) and up to 300 dirty days, and receives every day with a `rev` above its own.
- Offline, the dirty days wait. A failure retries after 5, 10, 20 seconds and so on, up to 5 minutes. Play never waits for the network.
- If the server refuses the token (the player was deleted elsewhere), the player is marked "not online" and Settings offers to join again.
- Deleting a player removes it from the device at once and queues its online copy, which the sync deletes now or once the device is online (a 401 means it is already gone). A player deleted while its first create was on the wire is queued too.

## Data model

One table, keys `pk` and `sk`. No secondary index is needed. Only `backend/src/data/schema.js` spells a key.

| Item | pk | sk | Attributes |
| --- | --- | --- | --- |
| Player | `PLAYER#<code>` | `PROFILE` | name, age, startLevels, muted, updatedAt, pinHash, pinSalt, tokenHashes, failedPins, lockedUntil, rev, createdAt |
| Day | `PLAYER#<code>` | `DAY#<YYYY-MM-DD>` | results by game id, rev |

A sync writes its days and raises the player's `rev` in one transaction, conditional on the `rev` and each day being as read; on a conflict it re-reads and retries (up to 5 times, then 503). So the days of each `rev` commit in order, and a reader that reads the `rev` before the days can never miss a day at or under it.

## API

All routes are under `/api/v1`. Bodies are checked with the zod schemas of `shared/schemas.js`; a bad body answers 400.

| Route | Auth | Does |
| --- | --- | --- |
| `POST /players` | none | Makes a player from the profile, start levels, PIN and any days already played. Returns code, token, profile, days and `rev`. |
| `POST /players/claim` | none | Takes code and PIN. Returns a new token, the profile, start levels, all days and `rev`. 401 for a wrong pair, 429 while locked. |
| `POST /players/{code}/sync` | token | Takes the profile (optional), dirty days and `since`. Merges, then returns the profile, the days with `rev` above `since`, and the new `rev`. |
| `PUT /players/{code}/pin` | token | Changes the PIN |
| `DELETE /players/{code}` | token | Deletes the player and all their days |
| `GET /health` | none | Liveness |

A response never carries the PIN hash, its salt, token hashes or the lockout fields. Unexpected errors answer 500 with no detail and are logged.

## Games and content

### A game

A game is a folder in `web/src/games/` whose `index.jsx` exports:

| Field | Meaning |
| --- | --- |
| `id`, `name`, `icon`, `how`, `color` | Identity, the one-line instructions, and its three colours |
| `skill` | One of `memory`, `focus`, `logic`, `speed`. Levels belong to skills, so a new game starts at the child's level for that skill. |
| `ages` | The ages it suits, for example `[7, 14]` |
| `rounds` | Rounds per session |
| `settings(level)` | Turns a level into the game's settings (sequence length, grid size, time limit) |
| `content` | The content type it reads, if any, for example `pairs` |
| `Round` | The React component of one round. It gets the settings, the content and `say`, and calls `onDone(true or false)`. |

Add the folder, list it in `web/src/games/index.js`, and the app shell, sync, themes and the day flow take it as it is. A game imports only React, `games/util.js`, `sound.js` and its own folder.

### Today's set

`pickToday(games, { age, date })` in `shared/today.js` picks one game per skill from the games whose `ages` fit the child. When a skill has several games, the pick rotates by date, the same on every device. With today's four games it always picks the same four.

Home shows today's set as tiles (Percy) or planets (Galaxy), each with its level and today's stars. Each is a link to play it, as often as the child likes; "Play" opens the first game not yet passed today.

### Age bands and themes

`shared/bands.js` lists the bands: `percy` for ages 7–10 and `galaxy` for 11–14. A new band is an entry there plus a folder in `web/src/themes/` with `index.jsx` and `theme.css`.

### Content packs

- Packs are JSON files in `content/<type>/<id>.json`. A pack has an `id`, a `title`, a `type`, the `ages` it fits and its `items`. Today's type is `pairs` (look-alike symbols, each with the level from which it can appear); Odd One Out and Same or Not read it.
- `npm run content:publish` checks each pack against `shared/schemas.js`, names each file by its hash, writes `manifest.json`, and with `CONTENT_BUCKET` set uploads them. Packs are cached for a year and the manifest for one minute. No app release is needed.
- On open, the app fetches the manifest, downloads new packs, keeps them in the Cache API, and drops packs the manifest no longer lists. Offline, it uses the last manifest and the kept packs.
- The starter pack is also bundled in the app, so a first launch works offline. A published pack with the same type and id replaces it.
- Vite serves `content/` at `/content/` locally, built the same way.

## Web app

| Screen | Route |
| --- | --- |
| Who's playing? | `/` |
| New player: name, age, PIN | `/new` |
| Home: today's games in the band's theme | `/play` |
| One game: intro (with its level), rounds, then its result: "Next level" after a pass, "Try again" after a miss, and the next game of today's set not yet passed | `/play/:gameId` |
| Play on another device: ID, QR, PIN | `/move` |
| Join from another device | `/join` (QR links land here with a fragment) |
| Settings: sound, another device, change PIN, delete player | `/settings` |

The layout is phone first, then iPad (two columns from 700px), then desktop (iPad layout, centred).

## Infrastructure

| Stack | Holds |
| --- | --- |
| Data | The table: pay per request; on prod, point-in-time recovery, deletion protection and kept on stack deletion |
| App | The API Lambda (Node 24, ARM), the HTTP API with a throttle, the web and content buckets (private, kept on stack deletion), and the CloudFront distribution: the SPA rewrite, the security headers with the CSP, and the `/api/*` and `/content/*` behaviours |

The content bucket lives in the app stack, beside the distribution that reads it, because a bucket in another stack would make the two stacks depend on each other. The web app goes up in two parts: hashed files cached for a year, and the rest (`index.html`, `sw.js`, the manifests) checked on every load, with a CloudFront invalidation.

`backend/infra/lib/stages.js` holds every difference between `dev` and `prod`, as in EHub. `DOMAIN_NAME` and `CERTIFICATE_ARN` add a custom domain.

## Security and privacy

- Only a nickname or first name and an age are stored. No email, no photo, no tracking.
- Unknown ID and wrong PIN answer alike; PINs lock after 5 tries; tokens and PINs are stored hashed.
- A child or parent can delete a player, which removes it from the device at once and from the server now or on the next sync. The app asks in the page, never with `window.confirm`, which in-app browsers and some webviews never show.
- The CSP allows scripts only from the app's origin and fonts only from Google Fonts. React renders user text as text; the lint forbids raw HTML.

## Testing

| Layer | What |
| --- | --- |
| shared | Levels from passes, merge convergence (any order, duplicates, old shape), progress, `pickToday`, ID words, schemas |
| tools | Pack building: hashing, bad packs, wrong folders, duplicate ids |
| backend | Create, claim, lockout, sync merge, two devices at once, profile edits, PIN change, delete, against DynamoDB Local |
| web | Each game's round, the puzzle rules, the store, the sync loop (with the delete queue) and the content loader with fakes, and the screens in both themes, including the in-page delete |
| e2e | J1: with no backend, a miss, a retry, a pass that unlocks the next level at once, and the rest of the day. J2: joining by ID and PIN, by QR link, and a refused PIN. J3: two devices play the same game offline and converge. J4: the built app opens and plays offline under the CSP. |

## Risks and open items

| Item | Note |
| --- | --- |
| Children's data law | Even a nickname, age and scores may count as a child's personal data (India's DPDP Act, COPPA in the US). The owner should confirm the consent need before a public launch. |
| AWS account, region, domain | Needed only to deploy (`docs/RUNBOOK.md`). The default region is `ap-south-1`, as in EHub. |
| iPhone home-screen app | A QR link opens Safari, whose storage differs from an installed home-screen app. There, a child joins by typing the ID and PIN. |
| PIN strength | 10,000 PINs. The lockout limits online guessing. A leaked table could be brute-forced offline, which is accepted for this data. |
| A locked ID | It answers 429, which shows that the ID exists; its PIN still protects it. |
| The API's own address | The HTTP API also answers at its `execute-api` address, outside CloudFront. Every write needs a token, and the stage throttle applies. |
| Clocks | Profile edits use the device clock for "later wins". A wrong clock can lose a sound or name edit, never a game result. |
| Percy's growth | The sprout stops growing at 1.8× (about 60 levels passed). Long runs need new growth stages. |
| Too hard to pass | A level never falls, so a child who cannot reach 80% stays on it. Each level is only about 1% harder than the last one they passed. |
