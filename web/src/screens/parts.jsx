// @ts-check
// Small pieces several screens share.
import { useMemo } from 'react'
import { syncState } from '../sync.js'

/** @param {{ n: number }} props */
export const Stars = ({ n }) => (
  <span className="stars" role="img" aria-label={`${n} of 3 stars`}>{'★'.repeat(n)}<s>{'★'.repeat(3 - n)}</s></span>
)

const COLORS = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#ec4899', '#22c55e', '#ffc93c']
export function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    left: `${Math.random() * 100}%`, background: COLORS[i % COLORS.length],
    animationDelay: `${Math.random() * 900}ms`, animationDuration: `${1800 + Math.random() * 1500}ms`, '--r': `${Math.random() * 720}deg`,
  })), [])
  return <div className="confetti" aria-hidden="true">{pieces.map((style, i) => <i key={i} style={/** @type {any} */ (style)} />)}</div>
}

const SAYS = { saved: 'Saved ✓', saving: 'Saving…', device: 'Saved on this device. It goes online when you are.', unlinked: 'Not saved online. Open Settings to join again.' }
/** @param {{ player: import('../store.js').Player }} props */
export const SyncStatus = ({ player }) => <p className="status" role="status">{SAYS[syncState(player)]}</p>
