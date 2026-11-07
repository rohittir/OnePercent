// @ts-check
// Attention: everything looks the same except one; find it before the bar runs out.
import { useEffect, useMemo } from 'react'
import { pairFor, rand, shrink, shuffle, TimerBar } from '../util.js'

/** @param {{ settings: { level: number, size: number, ms: number }, content: { a: string, b: string, level: number }[], say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { level, size, ms }, content, say, onDone }) {
  const [same, odd, where] = useMemo(() => {
    const pair = pairFor(content, level)
    return [...shuffle([pair.a, pair.b]), rand(size * size)]
  }, [content, level, size])
  useEffect(() => say('Find the odd one out!'), [say])
  return (
    <>
      <TimerBar ms={ms} onTimeout={() => onDone(false)} />
      <div className="grid" style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`, gap: size > 4 ? 6 : 10, fontSize: `calc(min(100vw - 48px, 540px) / ${size} * .45)`,
      }}>
        {Array.from({ length: size * size }, (_, i) => (
          <button key={i} className="cell" onClick={() => onDone(i === where)}>{i === where ? odd : same}</button>
        ))}
      </div>
    </>
  )
}

export default {
  id: 'odd-one-out', name: 'Odd One Out', icon: '🔍', skill: 'focus', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#0ea5e9', '#0369a1', '#bae6fd'], content: 'pairs',
  how: 'Everything looks the same… except one. Find it before the bar runs out!',
  /** A bigger grid every 12 levels, up to 7×7; 1% less time per level. @param {number} level */
  settings: (level) => ({ level, size: Math.min(7, 3 + Math.floor(level / 12)), ms: shrink(10_000, level, 3_000) }),
  Round,
}
