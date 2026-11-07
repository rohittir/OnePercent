// @ts-check
// Errors that become answers, and body checks against the schemas of @onepercent/shared.

export class HttpError extends Error {
  /** @param {number} status @param {string} code the `error` of the JSON answer */
  constructor(status, code) {
    super(code)
    this.status = status
  }
}

/**
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} value
 * @returns {T}
 */
export function parse(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) throw new HttpError(400, 'invalid')
  return result.data
}

/** Tests move time with it. */
export const clock = { now: () => Date.now() }
