// @ts-check
// Ages 11–14: Brain galaxy. Each skill is a planet, each day a mission; the rocket flies 1% farther for every level passed.
import { Link } from 'react-router'
import './theme.css'

// Planet spots on the map, as % of the map box, along the dashed path.
const SPOTS = [[10.8, 2.7], [57.8, 27.6], [14.6, 51.8], [60.1, 77.3]]
const PATH = 'M60 40C150 40 190 80 186 122S66 160 70 202S196 246 192 286'

/** @type {import('../index.js').Theme} */
export default {
  id: 'galaxy',
  words: {
    start: 'Launch 🚀', again: 'Launch again 🚀', grew: 'You flew 1% farther! 🚀', allDone: 'Every planet cleared today. Each pass is another 1%.',
    good: ['Direct hit!', 'Stellar!', 'Nailed it!', 'Light speed!'], bad: ['Missed! Next one', 'Off course!', 'So close!'],
  },
  stat: (prog) => `🚀 ${prog.growth.toFixed(2)}×`,
  Face: () => <span className="who-face" aria-hidden="true">🚀</span>,
  Coach: null,
  Cheer: ({ ok }) => <div className="big-rocket" aria-hidden="true"><span>{ok ? '🚀' : '🛰️'}</span></div>,
  HomeHero: ({ name, day, done, count }) => (
    <>
      <h1>Mission {day}</h1>
      <p className="muted">{done ? 'All planets cleared. Fly on for more.' : `${count} planets to visit today, ${name}`}</p>
      <div className="hero-rocket buddy" aria-hidden="true">🚀</div>
    </>
  ),
  HomeGames: ({ games, done }) => (
    <div className="map">
      <svg viewBox="0 0 268 330" aria-hidden="true"><path d={PATH} stroke="#ffffff40" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" fill="none" /></svg>
      {games.map(({ game, status, to }, i) => (
        <Link key={game.id} className="planet" to={to}
          style={/** @type {any} */ ({ '--c': game.color[0], '--l': game.color[2], left: `${SPOTS[i % 4][0]}%`, top: `${SPOTS[i % 4][1]}%` })}>
          <span>{game.name}<br />{status}</span>
        </Link>
      ))}
      <div className="rocket buddy" style={{ left: `${done ? 84 : 35}%`, top: `${done ? 70 : 1}%` }} aria-hidden="true"><span>🚀</span></div>
    </div>
  ),
}
