import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useBehavior } from '../hooks/useBehavior'
import { useBehaviorSocket } from '../context/BehaviorSocketContext'
import { BACKEND_URL } from '../config'

const GOOD_VERDICT = 'CLEAR'

const KEY_METER_MAX = 15
const MOUSE_METER_MAX = 40

const WHITE_NOTES = [
  { key: 'a', name: 'C', freq: 261.63 },
  { key: 's', name: 'D', freq: 293.66 },
  { key: 'd', name: 'E', freq: 329.63 },
  { key: 'f', name: 'F', freq: 349.23 },
  { key: 'g', name: 'G', freq: 392.0 },
  { key: 'h', name: 'A', freq: 440.0 },
  { key: 'j', name: 'B', freq: 493.88 },
  { key: 'k', name: 'C5', freq: 523.25 },
]
const BLACK_NOTES = [
  { key: 'w', name: 'C#', freq: 277.18, afterIndex: 0 },
  { key: 'e', name: 'D#', freq: 311.13, afterIndex: 1 },
  { key: 't', name: 'F#', freq: 369.99, afterIndex: 3 },
  { key: 'y', name: 'G#', freq: 415.3, afterIndex: 4 },
  { key: 'u', name: 'A#', freq: 466.16, afterIndex: 5 },
]
const WK = 52
const GAP = 4
const SLOT = WK + GAP
const BK = 30
const KEY_COLORS = ['#60a5fa', '#a78bfa', '#22d3ee']

const TUNE = ['a', 'a', 's', 'a', 'f', 'd', 'a', 'a', 's', 'a', 'g', 'f']
const TUNE_NAME = 'Happy Birthday'
const TUNE_FREQS = { a: 261.63, s: 293.66, d: 329.63, f: 349.23, g: 392.0, h: 440.0, j: 493.88, k: 523.25 }

function TrustGauge({ score }) {
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score))
  const color = score == null ? '#94a3b8' : pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f43f5e'
  const needleDeg = 240 + (pct / 100) * 240

  return (
    <div className="gauge-wrap">
      <div className="gauge-ring" />
      <div className="gauge-ring-inner" />
      <motion.div
        className="gauge-needle-wrap"
        animate={{ rotate: needleDeg }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="gauge-needle" style={{ background: color, boxShadow: `0 0 8px ${color}99` }} />
      </motion.div>
      <div className="gauge-pivot" style={{ background: color }} />
      <div className="gauge-center">
        <div className="gauge-num" style={{ color }}>{score == null ? '—' : Math.round(pct)}</div>
        <div className="gauge-unit">{score == null ? '' : '%'}</div>
        <div className="gauge-label">TRUST SCORE</div>
      </div>
    </div>
  )
}

function VerdictBadge({ decision }) {
  const allowed = decision == null || decision === GOOD_VERDICT
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={allowed ? 'allow' : 'warn'}
        className={`verdict-badge ${allowed ? 'allow' : 'warn'}`}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className="verdict-dot" />
        {allowed ? 'ALLOW' : 'REVIEW'}
      </motion.div>
    </AnimatePresence>
  )
}

function StatusChip({ status }) {
  const copy = {
    connecting: 'CONNECTING',
    live: 'LIVE',
    reconnecting: 'RECONNECTING',
    error: 'CONNECTION ERROR',
    locked: 'SESSION LOCKED',
  }[status]
  return (
    <div className={`status-chip status-${status}`}>
      <span className="status-dot" /> {copy}
    </div>
  )
}

function AvgRiskBar({ avgRisk, windowSize }) {
  const pct = avgRisk == null ? 0 : Math.max(0, Math.min(100, avgRisk))
  const color = pct >= 50 ? '#f43f5e' : pct >= 30 ? '#f59e0b' : '#22c55e'
  return (
    <div className="lm-avgrisk-row">
      <div className="lm-avgrisk-head">
        <span title={`Rolling average across the last ${windowSize ?? 5} frames (~10s) — smooths out one-off spikes.`}>
          10s avg <span style={{ opacity: 0.5, cursor: 'help' }}>ⓘ</span>
        </span>
        <span className="lm-avgrisk-val" style={{ color }}>{avgRisk == null ? '—' : `${Math.round(avgRisk)}%`}</span>
      </div>
      <div className="lm-avgrisk-track">
        <motion.div
          className="lm-avgrisk-fill"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function Sparkline({ values }) {
  const w = 240, h = 40
  if (!values.length) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="lm-sparkline" preserveAspectRatio="none">
        <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
      </svg>
    )
  }
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w : (i / (values.length - 1)) * w
    const y = h - (Math.max(0, Math.min(100, v)) / 100) * h
    return [x, y]
  })
  const lineStr = pts.map((p) => p.join(',')).join(' ')
  const areaStr = `0,${h} ${lineStr} ${w},${h}`
  const [lastX, lastY] = pts[pts.length - 1]
  const last = values[values.length - 1]
  const color = last >= 80 ? '#22c55e' : last >= 50 ? '#f59e0b' : '#f43f5e'
  const gradId = 'lm-spark-grad'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="lm-sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaStr} fill={`url(#${gradId})`} stroke="none" />
      <polyline points={lineStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={3.5}
        fill={color}
        animate={{ r: [3.5, 6, 3.5], opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

function SignalMeter({ icon, label, count, max, active }) {
  const pct = Math.min(100, Math.round((count / max) * 100))
  return (
    <div className="lm-signal">
      <div className="lm-signal-head">
        <span className={`lm-signal-dot ${active ? 'on' : ''}`} />
        <span className="lm-signal-label">{icon} {label}</span>
        <span className="lm-signal-count">{count}</span>
      </div>
      <div className="lm-signal-track">
        <motion.div className="lm-signal-fill" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  )
}

function PianoStrip() {
  const [activeKeys, setActiveKeys] = useState({})
  const [nowPlaying, setNowPlaying] = useState(null)
  const [volume, setVolume] = useState(60)
  const [octave, setOctave] = useState(0)
  const [sustain, setSustain] = useState(false)
  const [reverbOn, setReverbOn] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [justCompleted, setJustCompleted] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const audioCtxRef = useRef(null)
  const reverbRef = useRef(null)
  const volumeRef = useRef(volume)
  const octaveRef = useRef(octave)
  const sustainRef = useRef(sustain)
  const reverbOnRef = useRef(reverbOn)
  const stepIndexRef = useRef(stepIndex)

  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { octaveRef.current = octave }, [octave])
  useEffect(() => { sustainRef.current = sustain }, [sustain])
  useEffect(() => { reverbOnRef.current = reverbOn }, [reverbOn])
  useEffect(() => { stepIndexRef.current = stepIndex }, [stepIndex])

  const ensureAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        audioCtxRef.current = new Ctx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      if (!reverbRef.current) {
        const delay = ctx.createDelay(1.0)
        delay.delayTime.value = 0.19
        const feedback = ctx.createGain()
        feedback.gain.value = 0.32
        const wet = ctx.createGain()
        wet.gain.value = 0
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(wet)
        wet.connect(ctx.destination)
        reverbRef.current = { delay, wet }
      }
      return ctx
    } catch {
      return null
    }
  }

  const playTone = (baseFreq) => {
    const ctx = ensureAudio()
    if (!ctx) return
    try {
      const freq = baseFreq * Math.pow(2, octaveRef.current)
      const peak = 0.06 + (volumeRef.current / 100) * 0.16
      const release = sustainRef.current ? 1.1 : 0.42

      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      filter.type = 'lowpass'
      filter.frequency.value = 2200
      filter.Q.value = 0.4
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.035)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + release)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      if (reverbOnRef.current && reverbRef.current) {
        reverbRef.current.wet.gain.value = 0.28
        gain.connect(reverbRef.current.delay)
      }

      osc.start()
      osc.stop(ctx.currentTime + release + 0.05)
    } catch {
      
    }
  }

  useEffect(() => {
    const unlock = () => {
      ensureAudio()
      window.removeEventListener('pointerdown', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    const map = {}
    WHITE_NOTES.forEach((n) => { map[n.key] = { ...n, type: 'white' } })
    BLACK_NOTES.forEach((n) => { map[n.key] = { ...n, type: 'black' } })
    const ambientPool = WHITE_NOTES

    const onDown = (e) => {
      if (e.repeat) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const k = e.key.toLowerCase()
      const note = map[k]

      if (note) {
        setActiveKeys((a) => ({ ...a, [k]: true }))
        playTone(note.freq)
        setNowPlaying(note.name)

        if (note.type === 'white') {
          if (k === TUNE[stepIndexRef.current]) {
            const next = stepIndexRef.current + 1
            if (next >= TUNE.length) {
              setJustCompleted(true)
              setTimeout(() => setJustCompleted(false), 1400)
              setStepIndex(0)
            } else {
              setStepIndex(next)
            }
          }
        }
      } else if (/^[a-z0-9]$/i.test(k)) {
        const rnd = ambientPool[Math.floor(Math.random() * ambientPool.length)]
        setActiveKeys((a) => ({ ...a, [rnd.key]: true }))
        playTone(rnd.freq * 0.9)
        setTimeout(() => setActiveKeys((a) => ({ ...a, [rnd.key]: false })), 140)
      }
    }

    const onUp = (e) => {
      const k = e.key.toLowerCase()
      if (map[k]) setActiveKeys((a) => ({ ...a, [k]: false }))
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const wrapWidth = WHITE_NOTES.length * SLOT - GAP

  const playPreview = () => {
    const ctx = ensureAudio()
    if (!ctx || isPreviewing) return
    setIsPreviewing(true)
    const noteMs = 320
    TUNE.forEach((letter, i) => {
      setTimeout(() => {
        playTone(TUNE_FREQS[letter])
        setActiveKeys((a) => ({ ...a, [letter]: true }))
        setTimeout(() => setActiveKeys((a) => ({ ...a, [letter]: false })), noteMs * 0.7)
        if (i === TUNE.length - 1) setTimeout(() => setIsPreviewing(false), noteMs)
      }, i * noteMs)
    })
  }

  return (
    <div className="lm-piano">
      <div className="lm-card-title">Ambient rhythm</div>
      <div className="lm-piano-label">Type anywhere — or follow the tune below for a steadier baseline</div>

      <div className="lm-piano-tune">
        <div className="lm-piano-tune-name">
          {justCompleted ? '🎵 Nice rhythm — try it again' : `Try: ${TUNE_NAME}`}
          <button className="lm-piano-preview-btn" onClick={playPreview} disabled={isPreviewing}>
            {isPreviewing ? '♪ Playing…' : '▶ Preview'}
          </button>
        </div>
        <div className="lm-piano-tune-keys">
          {TUNE.map((letter, i) => (
            <span
              key={i}
              className={`lm-tune-key ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`}
            >
              {letter.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="lm-piano-keys-wrap" style={{ width: wrapWidth }}>
        <div className="lm-piano-white-row">
          {WHITE_NOTES.map((n, i) => (
            <motion.div
              key={n.key}
              className={`lm-key lm-key-white ${activeKeys[n.key] ? 'active' : ''} ${!activeKeys[n.key] && n.key === TUNE[stepIndex] ? 'suggested' : ''}`}
              style={{ width: WK }}
              animate={
                activeKeys[n.key]
                  ? { background: '#0b0f1a', boxShadow: `0 0 16px ${KEY_COLORS[i % 3]}99`, y: 3 }
                  : { background: '#e7ecf5', boxShadow: '0 0 0px rgba(0,0,0,0)', y: 0 }
              }
              transition={{ duration: 0.08 }}
            >
              <span className="lm-key-note">{n.name}</span>
              <span className="lm-key-letter">{n.key.toUpperCase()}</span>
            </motion.div>
          ))}
        </div>
        {BLACK_NOTES.map((n, i) => (
          <motion.div
            key={n.key}
            className={`lm-key lm-key-black ${activeKeys[n.key] ? 'active' : ''}`}
            style={{ width: BK, left: (n.afterIndex + 1) * SLOT - GAP / 2 - BK / 2 }}
            animate={
              activeKeys[n.key]
                ? { background: '#f1f5f9', boxShadow: `0 0 14px ${KEY_COLORS[i % 3]}cc`, y: 2 }
                : { background: '#0a0e18', boxShadow: '0 0 0px rgba(0,0,0,0)', y: 0 }
            }
            transition={{ duration: 0.08 }}
          />
        ))}
      </div>

      <div className="lm-piano-nowplaying">Now playing: <b>{nowPlaying ?? '—'}</b></div>

      <div className="lm-piano-controls">
        <div className="lm-piano-ctrl">
          <span className="lm-piano-ctrl-label">🔊 Vol</span>
          <input
            type="range" min="0" max="100" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="lm-piano-slider"
          />
        </div>
        <div className="lm-piano-ctrl">
          <span className="lm-piano-ctrl-label">Octave</span>
          <button className="lm-piano-btn" onClick={() => setOctave((o) => Math.max(-2, o - 1))}>−</button>
          <span className="lm-piano-octave-val">{4 + octave}</span>
          <button className="lm-piano-btn" onClick={() => setOctave((o) => Math.min(2, o + 1))}>+</button>
        </div>
        <button className={`lm-piano-toggle ${sustain ? 'on' : ''}`} onClick={() => setSustain((s) => !s)}>Sustain</button>
        <button className={`lm-piano-toggle ${reverbOn ? 'on' : ''}`} onClick={() => setReverbOn((r) => !r)}>Reverb</button>
      </div>
    </div>
  )
}

function ScribblePad() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)
  const rafRef = useRef(null)
  const hueRef = useRef(200)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const fade = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.fillStyle = 'rgba(10,12,16,0.055)'
      ctx.fillRect(0, 0, rect.width, rect.height)
      rafRef.current = requestAnimationFrame(fade)
    }
    fade()

    const pos = (e) => {
      const rect = canvas.getBoundingClientRect()
      return [e.clientX - rect.left, e.clientY - rect.top]
    }
    const onDown = (e) => { drawingRef.current = true; lastPosRef.current = pos(e) }
    const onMove = (e) => {
      if (!drawingRef.current || !lastPosRef.current) return
      const [x, y] = pos(e)
      const [lx, ly] = lastPosRef.current
      hueRef.current = (hueRef.current + 1.4) % 360
      ctx.strokeStyle = `hsl(${hueRef.current}, 85%, 65%)`
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastPosRef.current = [x, y]
    }
    const onUp = () => { drawingRef.current = false; lastPosRef.current = null }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div className="lm-scribble">
      <div className="lm-card-title">Scribble pad</div>
      <div className="lm-scribble-sub">Doodle while you think — trails fade on their own</div>
      <canvas ref={canvasRef} className="lm-scribble-canvas" />
    </div>
  )
}

export default function LiveMonitor() {
  const { user, updateUser } = useAuth()
  const { getEvents, clearEvents, attachListeners } = useBehavior()

  const [isCalibrating, setIsCalibrating] = useState(!user?.is_enrolled)
  const [calibKeys, setCalibKeys] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calibError, setCalibError] = useState('')


  useEffect(() => {
    if (!isCalibrating) return
    const detach = attachListeners(document)
    return () => { if (detach) detach() }
  }, [isCalibrating, attachListeners])

  const handleCalibrationTyping = async () => {
    if (isSubmitting) return;

    const events = getEvents();
    const keydowns = events.filter(e => e.type === 'key_down').length;
    setCalibKeys(keydowns);

    if (keydowns >= 50) {
      setIsSubmitting(true);
      setCalibError('');
      try {
        const response = await fetch(`${BACKEND_URL}/api/behavior/enroll/${user.userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events })
        });

        const data = await response.json();
        if (data.status === 'SUCCESS') {
            clearEvents();
            updateUser?.({ is_enrolled: true });
            setIsCalibrating(false);
        } else {
            setCalibError('That wasn\u2019t quite enough to build a reliable baseline — keep typing.');
            clearEvents();
            setCalibKeys(0);
            setIsSubmitting(false);
        }
      } catch (error) {
        console.error("Calibration failed:", error);
        setCalibError('Could not reach the server. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const {
    status, trustScore, riskScore, avgRiskScore, riskWindowSize,
    decision, consecutiveBad, rawVerdict, logs, scoreHistory,
    lockoutReason, signals, showWarning, dismissWarning,
  } = useBehaviorSocket()

  const [expandedLogId, setExpandedLogId] = useState(null)

  if (isCalibrating) {
    return (
      <div className="lm-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto', marginTop: '50px' }}>
        <h2>🛡️ Train Your AI Profile</h2>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
          Before monitoring begins, the AI needs to learn your unique typing rhythm.
          Please type the sentence below naturally.
        </p>
        <blockquote style={{ fontSize: '18px', fontStyle: 'italic', marginBottom: '20px', userSelect: 'none' }}>
          "The quick brown fox jumps over the lazy dog. Security is seamless and invisible."
        </blockquote>
        <textarea
          placeholder="Start typing here to calibrate..."
          onChange={handleCalibrationTyping}
          disabled={isSubmitting}
          style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', fontSize: '16px' }}
        />
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>
            <span>Calibration Progress</span>
            <span>{Math.min(calibKeys, 50)} / 50 keys</span>
          </div>
          <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((calibKeys / 50) * 100, 100)}%`, backgroundColor: '#3b82f6', height: '100%', transition: 'width 0.2s ease' }}></div>
          </div>
        </div>
        {isSubmitting && <p style={{ color: '#22c55e', marginTop: '15px', fontWeight: 'bold' }}>Syncing profile to AI...</p>}
        {calibError && <p style={{ color: '#fb7185', marginTop: '15px' }}>{calibError}</p>}
      </div>
    )
  }

  const showReviewBanner = status !== 'locked' && decision != null && decision !== GOOD_VERDICT

  return (
    <div className="live-monitor">
      <div className="lm-top">
        <StatusChip status={status} />
        {rawVerdict != null && (
          <div className={`lm-raw-verdict ${rawVerdict === GOOD_VERDICT ? 'tone-allow' : 'tone-warn'}`}>
            Raw AI verdict: <b>{rawVerdict}</b>
          </div>
        )}
        {consecutiveBad > 0 && (
          <div className="lm-warning-note">{consecutiveBad} consecutive anomalous frame{consecutiveBad > 1 ? 's' : ''}</div>
        )}
      </div>

      {status === 'locked' && (
        <div className="lm-lockout-banner">
          Session locked: {lockoutReason}
        </div>
      )}

      {showReviewBanner && (
        <div className="lm-review-banner">
          Elevated risk detected — sustained unusual behavior over the last ~10 seconds. Keep interacting normally; this clears automatically once your rhythm settles.
        </div>
      )}

      <AnimatePresence>
        {showWarning && status === 'live' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 150, pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'relative',
                width: '100%', maxWidth: 380, background: '#0f172a',
                border: '1px solid rgba(244,63,94,0.35)', borderRadius: 16,
                padding: '28px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                textAlign: 'center', pointerEvents: 'auto',
              }}
            >
              <button
                onClick={dismissWarning}
                aria-label="Dismiss warning"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'rgba(148,163,184,0.12)', color: '#94a3b8',
                  fontSize: 15, lineHeight: 1, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: 26, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 17 }}>Unusual activity detected</h3>
              <p style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                Your typing and mouse behavior have looked anomalous for a while now. If this continues, your session will be ended automatically for your protection.
              </p>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                Keep interacting normally — this closes on its own once your rhythm settles.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

     
      <div className="lm-hero">
        <div className="lm-card lm-hero-card">
          <TrustGauge score={trustScore} />
          <div className="lm-hero-side">
            <VerdictBadge decision={decision} />
            <div className="lm-risk-row" title="Risk score for this single frame, sent every ~2 seconds.">
              <span className="lm-risk-label">Now <span style={{ opacity: 0.5, cursor: 'help' }}>ⓘ</span></span>
              <span className="lm-risk-val">{riskScore == null ? '—' : Math.round(riskScore)}</span>
            </div>
            <AvgRiskBar avgRisk={avgRiskScore} windowSize={riskWindowSize} />
          </div>
        </div>
      </div>

      <div className="lm-scroll-hint">
        <span>↓ Scroll down and interact with the page — your rhythm shapes the score</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', maxWidth: 640, margin: '0 auto 12px' }}>
        These widgets generate real typing &amp; mouse behavior — the same signals a bank or workplace system could use to continuously verify it's really you.
      </div>

      <div className="lm-interact-row">
        <div className="lm-card lm-piano-card">
          <PianoStrip />
        </div>
        <div className="lm-card lm-scribble-card">
          <ScribblePad />
        </div>
      </div>

      <div className="lm-grid">
        <div className="lm-card lm-log-card">
          <div className="lm-log-title">Live scoring frames</div>
          <div className="lm-log-feed">
            {logs.length === 0 && (
              <div className="lm-log-empty">Waiting for the first scored frame — keep interacting with the page…</div>
            )}
            <AnimatePresence initial={false}>
              {logs.map((l) => {
                const isOpen = expandedLogId === l.id
                return (
                  <motion.div
                    key={l.id}
                    layout
                    className={`lm-log-line ${l.decision === GOOD_VERDICT ? 'tone-allow' : 'tone-warn'}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setExpandedLogId(isOpen ? null : l.id)}
                    style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="lm-log-time">{l.time.toLocaleTimeString([], { hour12: false })}</span>
                      <span className="lm-log-score">{l.score == null ? '—' : `${Math.round(l.score)}%`}</span>
                      <span className="lm-log-decision">{l.decision === GOOD_VERDICT ? 'ALLOW' : 'REVIEW'}</span>
                      {l.raw && l.raw !== l.decision && <span className="lm-log-raw">raw: {l.raw}</span>}
                    </div>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', fontSize: 12, color: '#94a3b8', paddingTop: 8, marginTop: 4, borderTop: '1px solid rgba(148,163,184,0.15)' }}
                        >
                          <div>Trust score: {l.score == null ? '—' : `${Math.round(l.score)}%`}</div>
                          <div>Raw AI verdict: {l.raw ?? '—'}</div>
                          <div>Avg risk (10s window): {l.avgRisk == null ? '—' : `${Math.round(l.avgRisk)}%`}</div>
                          <div>Decision: {l.decision}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="lm-card lm-signals-card">
          <div className="lm-signals-title">Behavioral signals</div>
          <div className="lm-signals-body">
            <div className="lm-signals-meters">
              <SignalMeter icon="⌨" label="Keyboard" count={signals.keys} max={KEY_METER_MAX} active={signals.keysActive} />
              <SignalMeter icon="🖱" label="Mouse" count={signals.mouseMoves + signals.mouseClicks} max={MOUSE_METER_MAX} active={signals.mouseActive} />
            </div>
            <div className="lm-trend-block">
              <div className="lm-trend-label">Trust score trend · last {scoreHistory.length} frames</div>
              <Sparkline values={scoreHistory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}