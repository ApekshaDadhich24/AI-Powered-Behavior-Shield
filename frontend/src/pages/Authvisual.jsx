import { useEffect, useRef, useState } from 'react'

function RadarShield() {
  return (
    <div className="radar-shield">
      <span className="radar-ring r1" />
      <span className="radar-ring r2" />
      <span className="radar-ring r3" />
      <div className="radar-core">🛡</div>
    </div>
  )
}

const LOG_LINES = [
  { tag: 'CAPTURE', tone: 'blue', text: 'Listening for keystroke rhythm' },
  { tag: 'MOUSE', tone: 'blue', text: 'Tracking cursor velocity' },
  { tag: 'BASELINE', tone: 'purple', text: 'Building behavioral profile' },
  { tag: 'RISK ENGINE', tone: 'cyan', text: 'Isolation Forest model warm' },
  { tag: 'WEBSOCKET', tone: 'purple', text: 'Live scoring channel established' },
  { tag: 'SCORE', tone: 'cyan', text: 'Confidence 98.2% against baseline' },
  { tag: 'VERDICT', tone: 'green', text: 'Session marked ALLOW' },
  { tag: 'SYSTEM', tone: 'blue', text: 'Awaiting next authentication cycle' },
]

function AuthLogFeed() {
  const [lines, setLines] = useState([{ ...LOG_LINES[0], key: 0 }])
  const idxRef = useRef(1)
  useEffect(() => {
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev, { ...LOG_LINES[idxRef.current % LOG_LINES.length], key: idxRef.current }]
        idxRef.current += 1
        return next.slice(-4)
      })
    }, 1700)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="auth-log-feed">
      {lines.map(l => (
        <div key={l.key} className={`auth-log-line tone-${l.tone}`}>
          <span className="auth-log-tag">[{l.tag}]</span>
          <span className="auth-log-text">{l.text}</span>
        </div>
      ))}
    </div>
  )
}

export default function AuthVisualPanel({ heading, sub }) {
  return (
    <div className="auth-right">
      <div className="auth-right-grid" aria-hidden="true" />
      <div className="auth-right-brand">
        <span className="auth-right-brand-shield">🛡</span> BEHAVIORSHIELD
      </div>

      <div className="auth-right-content">
        <RadarShield />
        <div className="auth-right-heading">{heading}</div>
        <div className="auth-right-sub">{sub}</div>
        <AuthLogFeed />
      </div>

      <div className="auth-right-status">
        <span className="auth-status-dot" /> AWAITING AUTHENTICATION · CHANNEL SECURE
      </div>
    </div>
  )
}