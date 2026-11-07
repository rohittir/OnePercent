// @ts-check
// PINs are kept as scrypt hashes; device tokens as SHA-256 hashes. Neither ever leaves the server (CLAUDE.md, rule 3).
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = /** @type {(pin: string, salt: string, len: number) => Promise<Buffer>} */ (promisify(scrypt))

/** @param {string} pin @param {string} [salt] @returns {Promise<{ hash: string, salt: string }>} */
export async function hashPin(pin, salt = randomBytes(16).toString('base64url')) {
  return { hash: (await scryptAsync(pin, salt, 32)).toString('base64url'), salt }
}

/** @param {string} pin @param {{ pinHash: string, pinSalt: string }} stored @returns {Promise<boolean>} */
export async function verifyPin(pin, { pinHash, pinSalt }) {
  const { hash } = await hashPin(pin, pinSalt)
  const a = Buffer.from(hash)
  const b = Buffer.from(pinHash)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Checked against for an unknown ID, so it costs the same time as a known one. */
export const NOBODY = { pinHash: 'x'.repeat(43), pinSalt: 'nobody' }

export const newToken = () => randomBytes(32).toString('base64url')
/** @param {string} token */
export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
