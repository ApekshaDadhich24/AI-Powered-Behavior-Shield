import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './StoryDemo.css'

import img1 from '../assets/story/panel-01-baseline.png'
import img2 from '../assets/story/panel-02-unattended.png'
import img3 from '../assets/story/panel-03-imposter.png'
import img4 from '../assets/story/panel-04-baseline-vs-live.png'
import img5 from '../assets/story/panel-05-risk-smoothing.png'
import img6 from '../assets/story/panel-06-warning.png'
import img7 from '../assets/story/panel-07-force-logout.png'
import img8 from '../assets/story/panel-08-otp.png'
import img9 from '../assets/story/panel-09-analytics.png'
import img10 from '../assets/story/panel-10-platform.png'

const PANEL_IMAGES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10]

/* ---------- palette (matches LandingPage.css tokens) ---------- */
const C = {
  blue: '#60a5fa',
  purple: '#a78bfa',
  cyan: '#22d3ee',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  ink: '#0b0e16',
  panel: '#141822',
  line: '#232a38',
  text: '#e7ecf3',
  text2: '#94a3b8',
  text3: '#64748b',
}

/* ---------- slide data ---------- */
const SLIDES = [
  { img: PANEL_IMAGES[0], score: 98, hud: 'Session normal', badge: 'Baseline established', color: 'blue',
    eyebrow: 'The story of a stolen session', h: 'Meet Aditi.',
    s: "She's logged into her banking app on a café laptop. BehaviorShield quietly maps her typing cadence and mouse movement.",
    stats: [['session', '#A19X42'], ['mode', 'armed'], ['confidence', '91%']] },
  { img: PANEL_IMAGES[1], score: 98, hud: 'Idle, still trusted', badge: 'Most apps stop watching here', color: 'amber',
    eyebrow: 'Step 1', h: 'She steps away for a coffee refill.',
    s: 'The tab stays open. No lock screen, no re-prompt — the session has been trusted since login.',
    stats: [['idle', '34s'], ['lock screen', 'none'], ['session', 'active']] },
  { img: PANEL_IMAGES[2], score: 94, hud: 'New operator detected', badge: 'Different hands, same login', color: 'amber',
    eyebrow: 'Step 2', h: 'Someone else sits down.',
    s: 'Same session, same login — a completely different person is now typing and clicking.',
    stats: [['keystroke drift', '+18%'], ['mouse drift', '+11%'], ['verdict', 'WATCH']] },
  { img: PANEL_IMAGES[3], score: 81, hud: 'Comparing live vs baseline', badge: 'Continuous behavioral auth', color: 'blue',
    eyebrow: 'Behind the scenes', h: 'BehaviorShield never stopped watching.',
    s: 'Every 2 seconds it compares live keystroke rhythm and mouse movement against Aditi\u2019s real baseline — not just her password.',
    stats: [['sample rate', '2s'], ['dwell Δ', '61ms'], ['flight Δ', '39ms']] },
  { img: PANEL_IMAGES[4], score: 58, hud: 'Pattern repeats', badge: '5-frame risk smoothing', color: 'amber',
    eyebrow: 'Behind the scenes', h: 'The mismatch keeps adding up.',
    s: 'A 5-frame rolling smoother ignores one-off jitter — but this pattern repeats, so sustainedBadFrames climbs.',
    stats: [['badFrames', '3'], ['window', '5 frames'], ['trend', 'declining']] },
  { img: PANEL_IMAGES[5], score: 41, hud: 'Frame 5 of 7', badge: 'Early warning fired', color: 'amber',
    eyebrow: 'Frame 5 of 7', h: 'A quiet warning fires.',
    s: 'Two frames before lockout, BehaviorShield flags the session as risky — one last chance to look like Aditi.',
    stats: [['frame', '5 / 7'], ['action', 'soft challenge'], ['verdict', 'WARN']] },
  { img: PANEL_IMAGES[6], score: 12, locked: true, hud: 'Frame 7 of 7', badge: 'Force logout', color: 'red',
    eyebrow: 'Frame 7 of 7', h: 'Session terminated. Automatically.',
    s: 'No password was cracked, no data was touched — the imposter is force-logged-out mid-action.',
    stats: [['frame', '7 / 7'], ['session', 'terminated'], ['verdict', 'DENY']] },
  { img: PANEL_IMAGES[7], score: 95, hud: 'Identity re-verified', badge: 'OTP step-up re-auth', color: 'blue',
    eyebrow: 'Getting back in', h: 'Aditi has to prove it\u2019s really her.',
    s: 'A one-time code lands in her inbox. She enters it, and only then is she let back into the account.',
    stats: [['channel', 'email'], ['code', '4-digit'], ['verdict', 'ALLOW']] },
  { img: PANEL_IMAGES[8], score: 95, hud: 'Incident recorded', badge: 'Session analytics', color: 'purple',
    eyebrow: 'After the fact', h: 'Every second of it, on record.',
    s: 'The full trust-score timeline, the exact frame it dropped, the moment it locked — logged automatically.',
    stats: [['duration', '3m 21s'], ['anomaly @', '12:04:01'], ['logged', 'yes']] },
  { img: PANEL_IMAGES[9], score: 100, hud: 'Behavior-as-a-Service', badge: 'One API key, any app', color: 'purple',
    eyebrow: 'The bigger picture', h: 'This isn\u2019t just Aditi\u2019s banking app.',
    s: 'BehaviorShield ships as a drop-in layer — one API key protects any login, on any app.',
    stats: [['endpoint', '/ws/auth'], ['auth', 'x-api-key'], ['verdict', 'ALLOW']] },
]

const DURATION = 5800
const CIRC = 100.5 // 2 * PI * 16

export default function StoryDemo() {
  const [current, setCurrent] = useState(0)
  const viewportRef = useRef(null)
  const segRefs = useRef([])
  const timerRef = useRef(null)
  const startRef = useRef(0)
  const remainingRef = useRef(DURATION)
  const holdTimerRef = useRef(null)
  const heldRef = useRef(false)

  const slide = SLIDES[current]

  const startSegment = (duration) => {
    startRef.current = Date.now()
    remainingRef.current = duration
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => goNext(), duration)
  }
  const pauseSegment = () => {
    clearTimeout(timerRef.current)
    remainingRef.current -= (Date.now() - startRef.current)
    const fill = segRefs.current[current]
    if (fill) fill.style.animationPlayState = 'paused'
  }
  const resumeSegment = () => {
    startRef.current = Date.now()
    timerRef.current = setTimeout(() => goNext(), Math.max(200, remainingRef.current))
    const fill = segRefs.current[current]
    if (fill) fill.style.animationPlayState = 'running'
  }

  const goTo = (i) => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, i))
    clearTimeout(timerRef.current)
    setCurrent(idx)
  }
  const goNext = () => { if (current < SLIDES.length - 1) goTo(current + 1) }
  const goPrev = () => goTo(Math.max(0, current - 1))

  useEffect(() => {
    if (current < SLIDES.length - 1) startSegment(DURATION)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const onPointerDown = (e) => {
    if (e.target.closest('.story-seg') || e.target.closest('.story-restart')) return
    heldRef.current = false
    holdTimerRef.current = setTimeout(() => { heldRef.current = true; pauseSegment() }, 200)
  }
  const onPointerUp = (e) => {
    if (e.target.closest('.story-seg') || e.target.closest('.story-restart')) return
    clearTimeout(holdTimerRef.current)
    if (heldRef.current) { resumeSegment(); heldRef.current = false; return }
    const rect = viewportRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 2) goPrev(); else goNext()
  }
  const onPointerLeave = () => {
    clearTimeout(holdTimerRef.current)
    if (heldRef.current) { resumeSegment(); heldRef.current = false }
  }

  const gaugeOffset = CIRC * (1 - Math.max(0, Math.min(100, slide.score)) / 100)
  const gaugeColor = slide.locked ? C.red : slide.score < 40 ? C.red : slide.score < 70 ? C.amber : C.blue

  return (
    <section className="story-section" id="story-demo">
      <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="sh-label">See it in action</div>
        <div className="sh-title">A stolen session, second by second</div>
        <div className="sh-sub">Tap through — or let it play. Every panel shows a real BehaviorShield feature doing its job.</div>
      </motion.div>

      <motion.div className="story-laptop" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="story-screen-bezel">
          <span className="story-camera-dot" />
          <div
            className="story-viewport"
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
          >
            <div className="story-progress-row">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`story-seg ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); goTo(i) }}
                >
                  <div
                    className="story-seg-fill"
                    ref={(el) => (segRefs.current[i] = el)}
                    style={i === current ? { animationDuration: `${DURATION}ms` } : undefined}
                  />
                </div>
              ))}
            </div>

            <div className="story-hud">
              <div className="story-gauge">
                <svg viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3.4" />
                  <circle
                    cx="18" cy="18" r="16" fill="none" stroke={gaugeColor} strokeWidth="3.4" strokeLinecap="round"
                    strokeDasharray={CIRC} strokeDashoffset={gaugeOffset}
                    transform="rotate(-90 18 18)"
                    style={{ transition: 'stroke-dashoffset .8s ease, stroke .4s ease' }}
                  />
                </svg>
                <span className="story-gauge-num">{slide.locked ? '⛔' : slide.score}</span>
              </div>
              <div className="story-hud-label">
                <span className="story-hud-title">Trust score</span>
                <span className="story-hud-sub">{slide.hud}</span>
              </div>
              <span className={`story-badge story-badge-${slide.color}`}>{slide.badge}</span>
            </div>

            <div className="story-art">
              <img src={slide.img} alt={slide.h} className="story-art-img" draggable="false" />
            </div>

            <div className="story-readout">
              {slide.stats.map(([label, val]) => (
                <div className="story-readout-row" key={label}>
                  <span className="ro-label">{label}</span>
                  <span className={`ro-val ${val === 'ALLOW' ? 'ro-green' : ''} ${val === 'DENY' ? 'ro-red' : ''}`}>{val}</span>
                </div>
              ))}
            </div>

            <div className="story-caption">
              <div className="story-eyebrow">{slide.eyebrow}</div>
              <h3 className="story-headline">{slide.h}</h3>
              <p className="story-sub">{slide.s}</p>
              {current === SLIDES.length - 1 && (
                <button className="story-restart" onClick={(e) => { e.stopPropagation(); goTo(0) }}>Watch again</button>
              )}
            </div>

            <button className="story-nav story-nav-prev" onClick={(e) => { e.stopPropagation(); goPrev() }} aria-label="Previous">‹</button>
            <button className="story-nav story-nav-next" onClick={(e) => { e.stopPropagation(); goNext() }} aria-label="Next">›</button>
          </div>
        </div>
        <div className="story-laptop-base" />
      </motion.div>
    </section>
  )
}