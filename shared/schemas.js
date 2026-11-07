// @ts-check
// The shapes that cross the network: API bodies (checked by the backend) and content packs (checked by the publish script and the app).
import { z } from 'zod'
import { AGES } from './bands.js'
import { CODE_PATTERN } from './ids.js'
import { SKILLS } from './levels.js'

export const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const GameId = z.string().regex(/^[a-z0-9-]{1,30}$/)
export const Code = z.string().regex(CODE_PATTERN)
export const Pin = z.string().regex(/^\d{4}$/)
export const Age = z.int().min(AGES[0]).max(AGES[1])

// A game's result on one date, over every play that day (shared/merge.js).
export const Result = z.strictObject({
  skill: z.enum(SKILLS),
  best: z.number().min(0).max(1),
  top: z.int().min(-1).max(10_000),
  playedAt: z.int().positive(),
})
export const Results = z.record(GameId, Result).refine((r) => Object.keys(r).length <= 20, 'too many games in a day')
/** A sync carries at most this many days; the app sends the rest in the next one. */
export const MAX_DAYS = 300
export const Days = z.record(DateString, Results).refine((d) => Object.keys(d).length <= MAX_DAYS, 'too many days')

export const Profile = z.strictObject({
  name: z.string().trim().min(1).max(20),
  age: Age,
  muted: z.boolean(),
  updatedAt: z.int().positive(),
})
// Players made before a skill existed have no start level for it; the app fills it in from the age.
export const StartLevels = z.strictObject(Object.fromEntries(SKILLS.map((s) => [s, z.int().min(0).max(1000).optional()])))

export const CreateBody = z.strictObject({ profile: Profile, startLevels: StartLevels, pin: Pin, days: Days })
export const ClaimBody = z.strictObject({ code: Code, pin: Pin })
export const SyncBody = z.strictObject({ since: z.int().min(0), profile: Profile.optional(), days: Days })
export const PinBody = z.strictObject({ pin: Pin })

// Content packs (docs/ARCHITECTURE.md, "Content packs"). A pack has a type; a game names the type it reads.
const PackHead = { id: z.string().regex(/^[a-z0-9-]{1,40}$/), title: z.string().min(1).max(60), ages: z.tuple([Age, Age]) }
export const PairsPack = z.strictObject({
  ...PackHead,
  type: z.literal('pairs'),
  // Two look-alike symbols; `level` is the skill level from which the pair can appear.
  items: z.array(z.strictObject({ a: z.string().min(1).max(8), b: z.string().min(1).max(8), level: z.int().min(0) })
    .refine((i) => i.a !== i.b, 'a pair needs two different symbols')).min(1).max(500),
})
export const Pack = z.discriminatedUnion('type', [PairsPack])
export const Manifest = z.strictObject({
  packs: z.array(z.strictObject({ id: PackHead.id, type: z.string(), ages: PackHead.ages, url: z.string().startsWith('/content/') })),
})
