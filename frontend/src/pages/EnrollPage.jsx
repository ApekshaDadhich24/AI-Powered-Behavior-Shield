import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBehavior } from '../hooks/useBehavior'
import { BACKEND_URL } from '../config'
import EnrollKeyboard from './EnrollKeyboard'
import './EnrollPage.css'

const PASSAGE =
  "the quick brown fox jumps over the lazy dog while the sun sets slowly behind the distant mountains, painting the sky in brilliant shades of orange and violet."

const TARGET = 150
const IGNORED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Enter'])


function normalizeKey(key) {
  if (key === ' ') return 'Space'
  if (key === 'Backspace') return '⌫'
  if (key === 'CapsLock') return 'Caps'
  if (key.length === 1) return key.toLowerCase()
  return key
}

const TIPS = [
  "No two people type exactly alike \u2014 even down to the millisecond.",
  "Typos are fine. Your natural rhythm matters more than accuracy.",
  "This baseline updates the moment enrollment finishes \u2014 nothing else to configure.",
  "BehaviorShield never stores what you type, only the timing between keys.",
  "Move your mouse naturally too \u2014 we learn pointer movement alongside typing.",
]

export default function EnrollPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()
  const { getEvents, clearEvents, attachKeyListeners, attachMouseListeners } = useBehavior()

  const pageRef = useRef(null)
  const inputRef = useRef(null)
  const pressedRef = useRef({})
  const lastUpRef = useRef(null)
  const dwellAvgRef = useRef(90)

  const [typed, setTyped] = useState('')
  const [strokes, setStrokes] = useState([])
  const [mouseSamples, setMouseSamples] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [retryNotice, setRetryNotice] = useState('')
  const [focused, setFocused] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [litKeys, setLitKeys] = useState(new Set())

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4500)
    return () => clearInterval(id)
  }, [])

  
  useEffect(() => {
    const el = inputRef.current
    const detach = attachKeyListeners(el)
    el?.focus()
    return () => { if (detach) detach() }
  }, [attachKeyListeners])

  useEffect(() => {
    const el = pageRef.current
    const detach = attachMouseListeners(el)
    return () => { if (detach) detach() }
  }, [attachMouseListeners])


  useEffect(() => {
    const id = setInterval(() => {
      const count = getEvents().filter(e => e.type === 'mouse_move').length
      setMouseSamples(count)
    }, 400)
    return () => clearInterval(id)
  }, [getEvents])

  const handleKeyDown = (e) => {
    setLitKeys((prev) => new Set(prev).add(normalizeKey(e.key)))

    if (IGNORED_KEYS.has(e.key)) return
    if (pressedRef.current[e.code] != null) return
    pressedRef.current[e.code] = performance.now()
  }

  const handleKeyUp = (e) => {
    setLitKeys((prev) => {
      const next = new Set(prev)
      next.delete(normalizeKey(e.key))
      return next
    })

    if (IGNORED_KEYS.has(e.key)) return
    const down = pressedRef.current[e.code]
    if (down == null) return
    const up = performance.now()
    const dwell = up - down
    const flight = lastUpRef.current != null ? Math.max(0, down - lastUpRef.current) : null
    lastUpRef.current = up
    delete pressedRef.current[e.code]

    dwellAvgRef.current = dwellAvgRef.current * 0.85 + dwell * 0.15
    const dev = Math.abs(dwell - dwellAvgRef.current) / (dwellAvgRef.current || 1)
    const tone = dev > 0.5 ? 'off' : dev > 0.22 ? 'mid' : 'on'

    setStrokes((s) => [...s, { dwell, flight, tone }])
  }

  const ready = strokes.length >= TARGET
  const remaining = TARGET - strokes.length
  const started = typed.length > 0
  const progress = Math.min(100, Math.round((strokes.length / TARGET) * 100))

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const dwellVals = strokes.map((s) => s.dwell)
  const flightVals = strokes.filter((s) => s.flight != null).map((s) => s.flight)
  const dwellAvg = avg(dwellVals)
  const flightAvg = avg(flightVals)
  const stdDev = dwellVals.length ? Math.sqrt(avg(dwellVals.map((v) => (v - dwellAvg) ** 2))) : 0
  const consistency = dwellVals.length > 3
    ? Math.max(0, Math.min(100, 100 - (stdDev / (dwellAvg || 1)) * 100))
    : null

  const handleSubmit = async () => {
    if (!user?.userId) {
      setError('No active session — please sign in again.')
      return
    }
    setError('')
    setRetryNotice('')
    setSubmitting(true)
    try {
    
      const events = getEvents()
      const res = await fetch(`${BACKEND_URL}/api/behavior/enroll/${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Enrollment failed.')
        return
      }

      if (data.status === 'SUCCESS') {
        updateUser({ is_enrolled: true })
        navigate('/dashboard')
      } else {
        setRetryNotice('That wasn\u2019t quite enough to build a reliable baseline — keep typing below.')
        clearEvents()
        setStrokes([])
        setTyped('')
      }
    } catch (err) {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  const focusInput = () => inputRef.current?.focus()

  return (
    <div className="enroll-page" ref={pageRef} onClick={focusInput}>
      <div className="enroll-topbar">
        <button
          type="button"
          className="enroll-signout"
          onClick={(e) => { e.stopPropagation(); logout(); navigate('/') }}
        >
          ← Sign out
        </button>
        <div className="enroll-brand"><span className="enroll-brand-shield">🛡</span> BehaviorShield</div>
      </div>

      <div className="enroll-header">
        <div className="enroll-eyebrow">— One-time setup</div>
        <div className="enroll-heading">Let's learn your rhythm</div>
        <div className="enroll-instruction">Click anywhere, then type the glowing key on the keyboard below. Move your mouse naturally too — we're learning that alongside your typing.</div>
      </div>

      {error && <div className="enroll-error">{error}</div>}
      {retryNotice && <div className="enroll-notice">{retryNotice}</div>}

      <div className={`enroll-passage-wrap ${focused ? 'focused' : ''}`}>
        {!started && (
          <div className="enroll-start-prompt">
            <span className="enroll-start-dot" /> Click here and start typing
          </div>
        )}
        <div className="enroll-passage">
          {PASSAGE.split('').map((ch, i) => {
            let cls = 'pending'
            if (i < typed.length) cls = typed[i] === ch ? 'correct' : 'incorrect'
            else if (i === typed.length) cls = 'current'
            return <span key={i} className={`ch ${cls}`}>{ch}</span>
          })}
        </div>
      </div>

      <div className="enroll-cards">
        <div className="enroll-card enroll-stats-card">
          <div className="enroll-stat">
            <div className="enroll-stat-num">{dwellVals.length ? Math.round(dwellAvg) : '—'}<span>ms</span></div>
            <div className="enroll-stat-label">Dwell avg</div>
          </div>
          <div className="enroll-stat">
            <div className="enroll-stat-num">{flightVals.length ? Math.round(flightAvg) : '—'}<span>ms</span></div>
            <div className="enroll-stat-label">Flight avg</div>
          </div>
          <div className="enroll-stat">
            <div className="enroll-stat-num">{consistency !== null ? Math.round(consistency) : '—'}{consistency !== null && <span>%</span>}</div>
            <div className="enroll-stat-label">Consistency</div>
          </div>
          <div className="enroll-stat">
            <div className="enroll-stat-num">{mouseSamples}</div>
            <div className="enroll-stat-label">Mouse points</div>
          </div>
        </div>

        <div className="enroll-card enroll-keyboard-card">
          <EnrollKeyboard litKeys={litKeys} />
        </div>

        <div className="enroll-card enroll-tip-card">
          <div className="enroll-tip-icon">💡</div>
          <div className="enroll-tip-text">{TIPS[tipIndex]}</div>
        </div>
      </div>

      <div className="enroll-progress-row">
        <div className="enroll-progress-track">
          <div className="enroll-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="enroll-progress-label">{strokes.length}/{TARGET} keystrokes</span>
      </div>

      <input
        ref={inputRef}
        className="enroll-hidden-input"
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setLitKeys(new Set()) }}
        autoComplete="off"
        spellCheck="false"
        onClick={(e) => e.stopPropagation()}
      />

      {ready ? (
        <button
          className="enroll-submit"
          onClick={(e) => { e.stopPropagation(); handleSubmit() }}
          disabled={submitting}
        >
          {submitting ? 'Building your baseline…' : 'Complete enrollment →'}
        </button>
      ) : (
        <div className="enroll-hint">{remaining} more keystrokes to go</div>
      )}
    </div>
  )
}