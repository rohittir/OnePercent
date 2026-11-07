// @ts-check
// The backend's routes (docs/ARCHITECTURE.md, "API"). Same origin: /api goes to the API through CloudFront, or Vite's proxy locally.

/**
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, token?: string | null }} [options]
 * @returns {Promise<any>} the JSON answer. Throws an Error with `status` (0 when offline).
 */
async function call(method, path, { body, token } = {}) {
  let res
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers: { ...(body !== undefined && { 'content-type': 'application/json' }), ...(token && { authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A sync as the page hides must outlive it. keepalive caps the body at 64 KB, so only then.
      keepalive: document.visibilityState === 'hidden',
    })
  } catch (cause) {
    throw Object.assign(new Error('offline', { cause }), { status: 0 })
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(data?.error ?? `HTTP ${res.status}`), { status: res.status })
  return data
}

/** @param {unknown} body */
export const createPlayer = (body) => call('POST', '/players', { body })
/** @param {string} code @param {string} pin */
export const claimPlayer = (code, pin) => call('POST', '/players/claim', { body: { code, pin } })
/** @param {string} code @param {string} token @param {unknown} body */
export const syncPlayer = (code, token, body) => call('POST', `/players/${code}/sync`, { body, token })
/** @param {string} code @param {string} token @param {string} pin */
export const changePin = (code, token, pin) => call('PUT', `/players/${code}/pin`, { body: { pin }, token })
/** @param {string} code @param {string} token */
export const deletePlayer = (code, token) => call('DELETE', `/players/${code}`, { token })
