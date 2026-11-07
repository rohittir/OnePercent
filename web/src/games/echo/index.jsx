// @ts-check
// Working memory: tiles light up in order; tap them back.
import { useEffect, useMemo, useRef, useState } from 'react'
import { tone } from '../../sound.js'
import { rand, shrink, useLater } from '../util.js'

/** @param {{ settings: { len: number, flash: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { len, flash }, say, onDone }) {
  const seq = useMemo(() => {
    const s = []
    while (s.length < len) {
      const t = rand(9)
      if (t !== s.at(-1)) s.push(t)
    }
    return s
  }, [len])
  const [lit, setLit] = useState(-1)
  const [turn, setTurn] = useState(false)
  const pos = useRef(0)
  const later = useLater()

  useEffect(() => {
    say('Watch the glow… 👀')
    /** @type {ReturnType<typeof setTimeout>[]} */
    const timers = []
    let t = 600
    for (const i of seq) {
      timers.push(setTimeout(() => { setLit(i); tone(i) }, t))
      t += flash
      timers.push(setTimeout(() => setLit(-1), t))
      t += flash / 3
    }
    timers.push(setTimeout(() => { setTurn(true); say('Your turn! Tap them in order') }, t))
    return () => timers.forEach(clearTimeout)
  }, [seq, flash, say])

  /** @param {number} i */
  const tap = (i) => {
    tone(i)
    setLit(i)
    later(() => setLit(-1), 180)
    if (i !== seq[pos.current]) return onDone(false)
    if (++pos.current === seq.length) onDone(true)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <button key={i} className={`cell${lit === i ? ' lit' : ''}`} disabled={!turn} aria-label={`tile ${i + 1}`} onClick={() => tap(i)} />
      ))}
    </div>
  )
}

export default {
  id: 'echo', name: 'Echo', icon: '🧠', skill: 'memory', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#8b5cf6', '#6d28d9', '#ddd6fe'],
  how: 'Tiles light up one by one. Tap them back in the same order.',
  /** One more tile every 10 levels, up to 9; each flash 1% quicker per level. @param {number} level */
  settings: (level) => ({ len: Math.min(9, 3 + Math.floor(level / 10)), flash: shrink(800, level, 350) }),
  Round,
}
