// @ts-check
// Pattern and logic: find the rule in the numbers and pick what comes next.
import { useEffect, useMemo } from 'react'
import { choices, makeSequence } from './rules.js'

/** @param {{ settings: { level: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { level }, say, onDone }) {
  const [shown, answer, options] = useMemo(() => {
    const seq = makeSequence(level)
    const last = /** @type {number} */ (seq.pop())
    return [seq, last, choices(last)]
  }, [level])
  useEffect(() => say('What comes next?'), [say])
  return (
    <>
      <div className="seq">
        {shown.map((n, i) => <span key={i} className="chip">{n}</span>)}
        <span className="chip q">?</span>
      </div>
      <div className="choices">
        {options.map((n) => <button key={n} className="chunk" onClick={() => onDone(n === answer)}>{n}</button>)}
      </div>
    </>
  )
}

export default {
  id: 'whats-next', name: "What's Next?", icon: '🧩', skill: 'logic', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#f59e0b', '#b45309', '#fde68a'],
  how: 'Find the rule in the numbers and pick what comes next.',
  /** @param {number} level */
  settings: (level) => ({ level }),
  Round,
}
