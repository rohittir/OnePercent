// @ts-check
// Switching rules: sort each card by colour or by shape, as the banner says. Every card matches one basket by colour and the
// other by shape, so the child follows the rule, not the habit (after the card-sorting task used with children).
import { useEffect, useMemo, useState } from 'react'
import { COLOURS, demoNext, mark, rand, Shape, SHAPES, shuffle } from '../util.js'

const RULES = /** @type {const} */ (['colour', 'shape'])

/**
 * @param {{ settings: { every: number, pattern: number[] | null }, say: (text: string) => void, onDone: (ok: boolean) => void,
 *   round?: number, demo?: boolean }} props
 */
function Round({ settings: { every, pattern }, say, onDone, round = 1, demo = false }) {
  const ruleAt = (/** @type {number} */ k) => RULES[pattern ? pattern[(k - 1) % pattern.length] : Math.floor((k - 1) / every) % 2]
  const rule = demo ? 'colour' : ruleAt(round)
  const switched = !demo && round > 1 && ruleAt(round - 1) !== rule
  const { baskets, card, right } = useMemo(() => {
    const [sa, sb] = shuffle(SHAPES)
    const [ca, cb] = shuffle(Object.keys(COLOURS))
    const card = rand(2) ? { shape: sa, colour: cb } : { shape: sb, colour: ca }
    const baskets = [{ shape: sa, colour: ca }, { shape: sb, colour: cb }]
    return { baskets, card, right: baskets.findIndex((b) => b[rule] === card[rule]) }
  }, [rule])
  const [pick, setPick] = useState(/** @type {number | null} */ (null))
  useEffect(() => say(rule === 'colour' ? 'Sort by colour 🎨' : 'Sort by shape 🔷'), [say, rule])
  /** @param {number} k */
  const choose = (k) => {
    if (pick !== null) return
    setPick(k)
    onDone(k === right)
  }
  return (
    <>
      <div className={`rule ${rule}${switched ? ' flash' : ''}`}>{switched ? '🔄 Switch! ' : ''}{rule === 'colour' ? '🎨 Colour' : '🔷 Shape'}</div>
      <div className="sort-card" role="img" aria-label={`a ${card.colour} ${card.shape}`}><Shape {...card} size={76} /></div>
      <div className="baskets">
        {baskets.map((b, k) => (
          <button key={k} className={`basket${mark(k, pick, right)}`} disabled={pick !== null} aria-label={`basket of the ${b.colour} ${b.shape}`}
            {...demoNext(k === right && pick === null)} onClick={() => choose(k)}>
            <Shape {...b} size={44} /><span aria-hidden="true">🧺</span>
          </button>
        ))}
      </div>
      <p className="why" aria-live="polite">
        {pick !== null && pick !== right ? (rule === 'colour' ? `Colour rule: ${card.colour} goes with ${card.colour}.` : `Shape rule: the ${card.shape} goes with the ${card.shape}.`) : ''}
      </p>
    </>
  )
}

export default {
  id: 'sort-switch', name: 'Sort Switch', icon: '🔀', skill: 'switch', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 6,
  color: ['#14b8a6', '#0f766e', '#99f6e4'],
  how: 'Put each card in the basket that matches the rule: colour or shape. Watch out for the switch!',
  /** The rule switches every 3 cards, every 2 from level 15, every card from 30, at random from 45. @param {number} level */
  settings: (level) => ({ every: Math.max(1, 3 - Math.floor(level / 15)), pattern: level >= 45 ? Array.from({ length: 12 }, () => rand(2)) : null }),
  Round,
}
