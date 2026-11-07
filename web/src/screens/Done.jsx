// @ts-check
// Today is finished: stars per game, +1% where a skill moves up tomorrow, and the theme's celebration.
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { starsFor } from '@onepercent/shared/levels.js'
import { progress } from '@onepercent/shared/progress.js'
import { pickToday } from '@onepercent/shared/today.js'
import { GAMES } from '../games/index.js'
import { buzz, sound } from '../sound.js'
import { today } from '../store.js'
import { useTheme } from '../themes/index.js'
import { Confetti, Stars } from './parts.jsx'

/** @param {{ player: import('../store.js').Player }} props */
export function Done({ player }) {
  const theme = useTheme(player.age)
  const navigate = useNavigate()
  const date = today()
  const results = player.days[date] ?? {}
  const set = pickToday(GAMES, { age: player.age, date })
  const complete = set.every((g) => results[g.id])
  useEffect(() => {
    if (!complete) return
    sound('win')
    buzz([30, 50, 30])
  }, [complete])
  if (!complete) return <Navigate to="/play" replace />

  const prog = progress(player, date)
  return (
    <>
      <Confetti />
      <div className="done">
        <theme.DoneHero prog={prog} />
        <div className="rows">
          {set.map((g) => (
            <div key={g.id} className="res">
              <span aria-hidden="true">{g.icon}</span>{g.name}
              {prog.nextLevels[g.skill] > prog.levels[g.skill] && <span className="up">+1%</span>}
              <Stars n={starsFor(results[g.id].score)} />
            </div>
          ))}
        </div>
        <button className="cta" id="bye" onClick={() => navigate('/play')}>{theme.words.bye}</button>
      </div>
    </>
  )
}
