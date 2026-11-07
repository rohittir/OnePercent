// @ts-check
// Every difference between dev and prod is here. Nothing else in infra/ tests the stage name.

export const STAGES = {
  dev: { pitr: false, retain: false, logRetentionDays: 7, throttle: { rateLimit: 20, burstLimit: 40 } },
  prod: { pitr: true, retain: true, logRetentionDays: 90, throttle: { rateLimit: 200, burstLimit: 400 } },
}

/**
 * @param {string} [name] the STAGE environment value, dev by default
 * @returns {{ name: 'dev' | 'prod' } & typeof STAGES.dev}
 */
export function resolveStage(name = 'dev') {
  if (name !== 'dev' && name !== 'prod') throw new Error(`STAGE must be dev or prod, not "${name}"`)
  return { name, ...STAGES[name] }
}
