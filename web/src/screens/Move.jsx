// @ts-check
// "Play on another device": the ID, a QR code of the join link, and the PIN behind a tap.
import { useState } from 'react'
import { Link } from 'react-router'
import { encode } from 'uqr'
import { syncAll } from '../sync.js'
import { useTheme } from '../themes/index.js'

/** The join link: the ID and PIN ride in the fragment, which never reaches a server or its logs. @param {string} code @param {string} pin */
export const joinLink = (code, pin) => `${location.origin}/join#${code}.${pin}`

/** @param {{ text: string }} props */
export function Qr({ text }) {
  const { data, size } = encode(text, { border: 2 })
  const d = data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join('')
  return (
    <svg className="qr" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="QR code to join on another device">
      <rect width={size} height={size} fill="#fff" /><path d={d} fill="#000" />
    </svg>
  )
}

/** @param {{ player: import('../store.js').Player }} props */
export function Move({ player }) {
  useTheme(player.age)
  const [showPin, setShowPin] = useState(false)
  return (
    <div className="setup">
      <h1>Play on another device</h1>
      {player.code ? (
        <>
          <p className="muted">Scan this with the other device's camera, or type the ID and PIN there under "Join from another device".</p>
          <Qr text={joinLink(player.code, player.pin)} />
          <div className="code" aria-label="Your ID">{player.code}</div>
          {showPin
            ? <div className="code" aria-label="Your PIN">PIN {player.pin}</div>
            : <button className="ghost" onClick={() => setShowPin(true)}>Show my PIN</button>}
        </>
      ) : (
        <>
          <p className="muted">Your ID appears once this device has been online. Your games are safe here until then.</p>
          <button className="cta" onClick={() => void syncAll()}>Try now</button>
        </>
      )}
      <Link className="ghost" to="/play">Back</Link>
    </div>
  )
}
