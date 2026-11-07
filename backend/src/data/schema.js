// @ts-check
// The only file that spells a key (CLAUDE.md, rule 4). The models follow docs/ARCHITECTURE.md, "Data model".
// Times are epoch milliseconds, set by the code that writes them.

/** The keys of the models below, for the raw transaction in players.js. @param {string} code */
export const playerKey = (code) => ({ pk: `PLAYER#${code}`, sk: 'PROFILE' })
/** @param {string} code @param {string} date */
export const dayKey = (code, date) => ({ pk: `PLAYER#${code}`, sk: `DAY#${date}` })

export const SCHEMA = {
  format: 'onetable:1.1.0',
  version: '0.0.1',
  indexes: { primary: { hash: 'pk', sort: 'sk' } },
  params: { timestamps: false },
  models: {
    Player: {
      pk: { type: String, value: 'PLAYER#${code}' },
      sk: { type: String, value: 'PROFILE' },
      code: { type: String, required: true },
      name: { type: String, required: true },
      age: { type: Number, required: true },
      startLevels: { type: Object, required: true },
      muted: { type: Boolean },
      updatedAt: { type: Number, required: true },
      // Never sent to a client (CLAUDE.md, rule 3).
      pinHash: { type: String, required: true },
      pinSalt: { type: String, required: true },
      tokenHashes: { type: Array },
      failedPins: { type: Number, default: 0 },
      lockedUntil: { type: Number },
      rev: { type: Number, default: 0 },
      createdAt: { type: Number, required: true },
    },
    Day: {
      pk: { type: String, value: 'PLAYER#${code}' },
      sk: { type: String, value: 'DAY#${date}' },
      code: { type: String, required: true },
      date: { type: String, required: true },
      results: { type: Object, required: true },
      rev: { type: Number, required: true },
    },
  },
}
