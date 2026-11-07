// @ts-check
// Ages 7–10: Percy and pals. Percy's sprout grows 1% for every level passed.
import { Link } from 'react-router'
import './theme.css'

/** @param {{ grown?: number, className?: string }} props grown: levels passed since day one */
export function Percy({ grown = 0, className = '' }) {
  // shortcut: growth caps at 1.8× (about 60 levels passed); add new stages (more leaves, a flower) for long runs.
  const g = Math.min(1.8, 1.01 ** grown)
  return (
    <svg className={`percy ${className}`} viewBox="0 -20 100 120" aria-hidden="true">
      <g transform={`translate(50 30) scale(${g}) translate(-50 -30)`}>
        <path d="M50 30C50 20 52 13 56 9" stroke="#22a55a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M55 11C64 2 77 6 77 12C68 17 60 16 55 11Z" fill="#4ade80" />
        <path d="M51 17C42 9 31 12 31 18C40 22 47 21 51 17Z" fill="#4ade80" />
      </g>
      <ellipse cx="50" cy="63" rx="38" ry="33" fill="#ffc93c" />
      <ellipse cx="50" cy="73" rx="22" ry="15" fill="#ffe08a" />
      <circle cx="37" cy="57" r="6.5" fill="#2b2340" /><circle cx="63" cy="57" r="6.5" fill="#2b2340" />
      <circle cx="39" cy="55" r="2.2" fill="#fff" /><circle cx="65" cy="55" r="2.2" fill="#fff" />
      <path d="M42 71Q50 79 58 71" stroke="#2b2340" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="26" cy="69" r="5" fill="#ff8fa3" opacity=".55" /><circle cx="74" cy="69" r="5" fill="#ff8fa3" opacity=".55" />
    </svg>
  )
}

/** @type {import('../index.js').Theme} */
export default {
  id: 'percy',
  words: {
    start: 'Play ▶', again: 'Play again ▶', grew: 'Percy grew 1%! 🌱', allDone: 'All passed today! Every pass is another 1% 🌱',
    good: ['Nice!', 'Wow!', 'You got it!', 'Super!', 'Brainy!'], bad: ['Oops! Next one!', 'Almost!', 'Keep going!'],
  },
  stat: (prog) => `⭐ ${prog.stars}`,
  Face: () => <Percy />,
  Coach: ({ grown, mood }) => <div className="buddy"><Percy grown={grown} className={mood === 'right' ? 'hop' : mood === 'wrong' ? 'shake' : ''} /></div>,
  Cheer: ({ grown, ok }) => (
    <div className="buddy">
      <div className="grown"><Percy grown={grown} className={ok ? 'hop' : 'shake'} />{ok && <span className="pill up-chip">+1%</span>}</div>
    </div>
  ),
  HomeHero: ({ name, prog, done }) => (
    <>
      <div className="bubble">{done ? 'You passed them all today! Want to grow more?' : `Ready to grow, ${name}?`}</div>
      <div className="buddy"><Percy grown={prog.gained} /></div>
      <div className="ground" />
    </>
  ),
  HomeGames: ({ games, day }) => (
    <>
      <div className="sheet-h"><b>Today's 1%</b><span className="muted">Day {day}</span></div>
      <div className="tiles">
        {games.map(({ game, status, to }) => (
          <Link key={game.id} className="tile" to={to} style={/** @type {any} */ ({ '--c': game.color[0], '--e': game.color[1] })}>
            <span className="ic" aria-hidden="true">{game.icon}</span><b>{game.name}</b><small>{status}</small>
          </Link>
        ))}
      </div>
    </>
  ),
}
