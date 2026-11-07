// @ts-check
// Reasoning: every row and column of the grid follows a rule; pick the tile that fits the gap. No words or numbers.
import { useEffect, useMemo, useState } from 'react'
import { demoNext, mark, Shape } from '../util.js'
import { makePattern } from './rules.js'

/** @param {{ tile: { shape: string, colour: string, count: number } }} props */
const Tile = ({ tile }) => (
  <>{Array.from({ length: tile.count }, (_, i) => <Shape key={i} shape={tile.shape} colour={tile.colour} size={[0, 40, 28, 22][tile.count]} />)}</>
)
/** @param {{ shape: string, colour: string, count: number }} t */
const describe = (t) => `${t.count} ${t.colour} ${t.shape}${t.count > 1 ? 's' : ''}`

/** @param {{ settings: { rules: number, latin: boolean, options: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings, say, onDone }) {
  const { cell, answer, options, why } = useMemo(() => makePattern(settings), [settings])
  const right = options.indexOf(answer)
  const [pickd, setPick] = useState(/** @type {number | null} */ (null))
  useEffect(() => say('Which tile fits the empty square?'), [say])
  /** @param {number} i */
  const choose = (i) => {
    if (pickd !== null) return
    setPick(i)
    onDone(i === right)
  }
  return (
    <>
      <div className="matrix">
        {Array.from({ length: 9 }, (_, k) => (k === 8
          ? <div key={k} className={`mcell gap${pickd !== null ? ' filled' : ''}`} aria-label={pickd !== null ? describe(answer) : 'the empty square'}>{pickd !== null ? <Tile tile={answer} /> : '?'}</div>
          : <div key={k} className="mcell" aria-label={describe(cell(Math.floor(k / 3), k % 3))}><Tile tile={cell(Math.floor(k / 3), k % 3)} /></div>))}
      </div>
      <div className={`opts${options.length > 4 ? ' six' : ''}`}>
        {options.map((o, i) => (
          <button key={i} className={`mcell${mark(i, pickd, right)}`} disabled={pickd !== null} aria-label={describe(o)} {...demoNext(i === right && pickd === null)} onClick={() => choose(i)}>
            <Tile tile={o} />
          </button>
        ))}
      </div>
      <p className="why" aria-live="polite">{pickd !== null && pickd !== right ? why : ''}</p>
    </>
  )
}

export default {
  id: 'pattern-grid', name: 'Pattern Grid', icon: '🔳', skill: 'logic', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#f97316', '#c2410c', '#fed7aa'],
  how: 'Each row and column follows a rule. Pick the tile that fits the empty square.',
  /** One rule, then two from level 15, three from 30; "once in every row and column" from 25; six choices from 40. @param {number} level */
  settings: (level) => ({ rules: 1 + Math.min(2, Math.floor(level / 15)), latin: level >= 25, options: level >= 40 ? 6 : 4 }),
  Round,
}
