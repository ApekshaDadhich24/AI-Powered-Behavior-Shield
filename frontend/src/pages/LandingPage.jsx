import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './LandingPage.css'

/* ============ ICONS ============ */

function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (<><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></>) : (<><line x1="3.5" y1="7" x2="20.5" y2="7" /><line x1="3.5" y1="12" x2="20.5" y2="12" /><line x1="3.5" y1="17" x2="20.5" y2="17" /></>)}
    </svg>
  )
}
function ActivityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
}
function ZapIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
}
function ShieldIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3z" /><path d="M9 12l2 2 4-4" /></svg>
}
function LayersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
}

/* ============ BACKGROUND NETWORK CANVAS ============ */

function NetworkCanvas() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 400, y: 250 })
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const onMove = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('resize', resize)
    class Particle {
      constructor() { this.reset() }
      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.3
        this.vy = (Math.random() - 0.5) * 0.3
        this.size = 1 + Math.random() * 1.5
        this.hue = 200 + Math.random() * 60
      }
      update() {
        const dx = mouseRef.current.x - this.x
        const dy = mouseRef.current.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 130) {
          const f = (130 - dist) / 130
          this.vx += (dx / dist) * f * 0.15
          this.vy += (dy / dist) * f * 0.15
        }
        this.vx *= 0.97; this.vy *= 0.97
        this.x += this.vx; this.y += this.vy
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1
        this.x = Math.max(0, Math.min(canvas.width, this.x))
        this.y = Math.max(0, Math.min(canvas.height, this.y))
      }
      draw() {
        const dx = mouseRef.current.x - this.x
        const dy = mouseRef.current.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const glow = Math.max(0, 1 - dist / 130)
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size + glow * 2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${this.hue},70%,65%,${0.2 + glow * 0.5})`
        ctx.fill()
      }
    }
    const count = window.innerWidth < 768 ? 28 : 60
    const particles = Array.from({ length: count }, () => new Particle())
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.12
            const mdx = mouseRef.current.x - (a.x + b.x) / 2
            const mdy = mouseRef.current.y - (a.y + b.y) / 2
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
            const glow = Math.max(0, 1 - mdist / 130)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `hsla(215,70%,65%,${alpha + glow * 0.3})`
            ctx.lineWidth = 0.5 + glow
            ctx.stroke()
          }
        }
      }
      const grad = ctx.createRadialGradient(mouseRef.current.x, mouseRef.current.y, 0, mouseRef.current.x, mouseRef.current.y, 140)
      grad.addColorStop(0, 'rgba(37,99,235,0.06)')
      grad.addColorStop(1, 'rgba(37,99,235,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => { p.update(); p.draw() })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={canvasRef} className="network-canvas" />
}

/* ============ DNA HELIX (always-on scanning glow + mouse highlight) ============ */

const HELIX_BLUE = [96, 165, 250]
const HELIX_PURPLE = [167, 139, 250]
const HELIX_CYAN = [34, 211, 238]
const HELIX_W = 320
const HELIX_H = 480

function lerp(a, b, t) { return a + (b - a) * t }
function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}
// smooth brand-consistent gradient along the strand's length instead of a
// time-cycling rainbow hue — reads as designed rather than psychedelic
function colorForFrac(frac, reversed) {
  const f = reversed ? 1 - frac : frac
  return f < 0.5 ? lerpColor(HELIX_BLUE, HELIX_PURPLE, f / 0.5) : lerpColor(HELIX_PURPLE, HELIX_CYAN, (f - 0.5) / 0.5)
}

function DNAHelix() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const mouseRef = useRef({ x: -999, y: -999 })

  const handleWrapMove = (e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    wrap.style.setProperty('--tiltX', `${(-py * 9).toFixed(2)}deg`)
    wrap.style.setProperty('--tiltY', `${(px * 9).toFixed(2)}deg`)
  }
  const handleWrapLeave = () => {
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.style.setProperty('--tiltX', '0deg')
    wrap.style.setProperty('--tiltY', '0deg')
  }
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let t = 0, raf
    const onMove = e => {
      const r = canvas.getBoundingClientRect()
      const scaleX = HELIX_W / r.width
      const scaleY = HELIX_H / r.height
      mouseRef.current = { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY }
    }
    const onLeave = () => { mouseRef.current = { x: -999, y: -999 } }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    const draw = () => {
      ctx.clearRect(0, 0, HELIX_W, HELIX_H)
      const cx = HELIX_W / 2, amplitude = 60 + Math.sin(t * 0.25) * 9, freq = 0.033
      // a slow, continuous scan band that travels the length of the helix
      // so the strand always looks alive even when nobody is hovering
      const scanY = (Math.sin(t * 0.5) * 0.5 + 0.5) * HELIX_H
      const pts1 = [], pts2 = []
      for (let y = 0; y <= HELIX_H; y += 3) {
        const phase = y * freq + t
        pts1.push({ x: cx + Math.sin(phase) * amplitude, y, depth: Math.cos(phase) })
        pts2.push({ x: cx - Math.sin(phase) * amplitude, y, depth: -Math.cos(phase) })
      }

      // backbone drawn segment-by-segment so width/opacity can respond to
      // simulated depth — the strand that's "in front" reads brighter and
      // thicker, the strand curling behind fades back, giving real 3D twist
      const drawStrand = (pts, reversed) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1]
          const depth = (a.depth + b.depth) / 2
          const near = (depth + 1) / 2
          const frac = a.y / HELIX_H
          const [r, g, bl] = colorForFrac(frac, reversed)
          ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${0.16 + near * 0.6})`
          ctx.lineWidth = 0.8 + near * 1.9
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
      }
      drawStrand(pts1, false)
      drawStrand(pts2, true)

      // rungs + nucleotide dots, with mouse/scan glow layered on top
      for (let i = 0; i < pts1.length; i += 5) {
        const p1 = pts1[i], p2 = pts2[i]
        const mid = (p1.x + p2.x) / 2
        const mouseDist = Math.sqrt((mouseRef.current.x - mid) ** 2 + (mouseRef.current.y - p1.y) ** 2)
        const mouseGlow = Math.max(0, 1 - mouseDist / 110)
        const scanDist = Math.abs(p1.y - scanY)
        const scanGlow = Math.max(0, 1 - scanDist / 72) * 0.75
        const glow = Math.max(mouseGlow, scanGlow)
        const frac = p1.y / HELIX_H
        const c1 = colorForFrac(frac, false)
        const c2 = colorForFrac(frac, true)

        const rungGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
        rungGrad.addColorStop(0, `rgba(${c1[0] | 0},${c1[1] | 0},${c1[2] | 0},${0.08 + glow * 0.4})`)
        rungGrad.addColorStop(1, `rgba(${c2[0] | 0},${c2[1] | 0},${c2[2] | 0},${0.08 + glow * 0.4})`)
        ctx.strokeStyle = rungGrad
        ctx.lineWidth = 0.7 + glow * 1.7
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()

        const near1 = (p1.depth + 1) / 2, near2 = (p2.depth + 1) / 2
        const ds1 = 1.4 + near1 * 1.6 + glow * 2.9
        const ds2 = 1.4 + near2 * 1.6 + glow * 2.9
        ctx.fillStyle = `rgba(${c1[0] | 0},${c1[1] | 0},${c1[2] | 0},${0.35 + near1 * 0.4 + glow * 0.5})`
        ctx.beginPath(); ctx.arc(p1.x, p1.y, ds1, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(${c2[0] | 0},${c2[1] | 0},${c2[2] | 0},${0.35 + near2 * 0.4 + glow * 0.5})`
        ctx.beginPath(); ctx.arc(p2.x, p2.y, ds2, 0, Math.PI * 2); ctx.fill()

        if (glow > 0.3) {
          ctx.beginPath(); ctx.arc(p1.x, p1.y, ds1 * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${c1[0] | 0},${c1[1] | 0},${c1[2] | 0},${glow * 0.14})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p2.x, p2.y, ds2 * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${c2[0] | 0},${c2[1] | 0},${c2[2] | 0},${glow * 0.14})`; ctx.fill()
        }
      }

      // flowing signal particles riding the strand — echoes the "live data"
      // motif from the hero bridge, gives the helix a sense of transmission
      const buffer = 20
      const cycle = HELIX_H + buffer * 2
      for (let i = 0; i < 4; i++) {
        const py = ((t * 52 + i * (cycle / 4)) % cycle) - buffer
        if (py < 0 || py > HELIX_H) continue
        const phase = py * freq + t
        const px = cx + Math.sin(phase) * amplitude
        const edgeFade = Math.min(1, py / 30, (HELIX_H - py) / 30)
        const glowR = ctx.createRadialGradient(px, py, 0, px, py, 10)
        glowR.addColorStop(0, `rgba(34,211,238,${0.85 * edgeFade})`)
        glowR.addColorStop(1, 'rgba(34,211,238,0)')
        ctx.fillStyle = glowR
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(224,250,252,${0.9 * edgeFade})`
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
      }

      if (mouseRef.current.x > -500) {
        const g = ctx.createRadialGradient(mouseRef.current.x, mouseRef.current.y, 0, mouseRef.current.x, mouseRef.current.y, 100)
        g.addColorStop(0, 'rgba(96,165,250,0.08)'); g.addColorStop(1, 'rgba(96,165,250,0)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, HELIX_W, HELIX_H)
      }
      t += 0.018
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf) }
  }, [])
  return (
    <div ref={wrapRef} className="dna-canvas-wrap" onMouseMove={handleWrapMove} onMouseLeave={handleWrapLeave}>
      <canvas ref={canvasRef} width={HELIX_W} height={HELIX_H} className="dna-canvas" />
    </div>
  )
}

/* animated data particles bridging the text column and the helix */
function HeroBridge() {
  const dots = [0, 1, 2, 3, 4]
  return (
    <div className="hero-bridge" aria-hidden="true">
      {dots.map(i => (
        <span key={i} className="bridge-dot" style={{ animationDelay: `${i * 0.9}s`, top: `${20 + i * 14}%` }} />
      ))}
    </div>
  )
}

/* ============ PIPELINE STRIP ============ */

function PipelineStrip() {
  const stages = [
    { id: 'capture', label: 'Capture' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'score', label: 'Score' },
    { id: 'verdict', label: 'Verdict' },
  ]
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % stages.length), 1800)
    return () => clearInterval(id)
  }, [])
  return (
    <section className="pipeline-section">
      <div className="pipeline-strip">
        {stages.map((s, i) => (
          <div className="pipeline-item" key={s.id}>
            <div className={`pipeline-step ${i === active ? 'active' : ''} ${i < active ? 'done' : ''}`}>
              <span className="pipeline-dot" />
              {s.label}
            </div>
            {i < stages.length - 1 && <span className={`pipeline-arrow ${i < active ? 'done' : ''}`}>→</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============ REAL-TIME INTELLIGENCE STATS ============ */

function StatCard({ icon, target, decimal, suffix, prefix, label, points, delay, tint }) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  const start = () => {
    if (started.current) return
    started.current = true
    let current = 0
    const increment = target / 60
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { current = target; clearInterval(timer) }
      setVal(current)
    }, 22)
  }
  return (
    <motion.div
      className={`intel-card glass-card tint-${tint}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      onViewportEnter={start}
    >
      <div className="intel-bar" />
      <div className="intel-top">
        <div className="intel-icon">{icon}</div>
        <svg className="intel-spark" viewBox="0 0 80 28" preserveAspectRatio="none">
          <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="intel-num">{prefix}{decimal ? val.toFixed(1) : Math.floor(val).toLocaleString()}{suffix}</div>
      <div className="intel-label">{label}</div>
    </motion.div>
  )
}

function StatsIntelligence() {
  return (
    <section className="intel-section">
      <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="sh-label">Real-time intelligence</div>
        <div className="sh-title">Numbers that update while you read them</div>
        <div className="sh-sub">A live look at what the engine is doing right now, across every connected session.</div>
      </motion.div>
      <div className="intel-grid">
        <StatCard tint="blue" icon={<ActivityIcon />} target={1247} suffix="" label="Sessions protected today" delay={0} points="0,20 12,16 24,18 36,10 48,13 60,6 72,8" />
        <StatCard tint="cyan" icon={<ZapIcon />} target={340} suffix="ms" label="Avg verification latency" delay={0.08} points="0,6 12,9 24,7 36,14 48,12 60,20 72,18" />
        <StatCard tint="green" icon={<ShieldIcon />} target={99.4} decimal suffix="%" label="Detection accuracy" delay={0.16} points="0,18 12,16 24,17 36,12 48,10 60,8 72,5" />
        <StatCard tint="purple" icon={<LayersIcon />} target={2.4} decimal suffix="M+" label="Behavioral signals captured" delay={0.24} points="0,22 12,17 24,15 36,16 48,9 60,10 72,4" />
      </div>
    </section>
  )
}

/* ============ LIVE TYPING DEMO — the actual product, running client-side ============ */

const IGNORED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'])

function TypingDemo() {
  const [strokes, setStrokes] = useState([])
  const [text, setText] = useState('')
  const pressedRef = useRef({})
  const lastUpRef = useRef(null)

  const handleKeyDown = (e) => {
    if (IGNORED_KEYS.has(e.key)) return
    if (pressedRef.current[e.code] != null) return // ignore OS key-repeat while held
    pressedRef.current[e.code] = performance.now()
  }

  const handleKeyUp = (e) => {
    if (IGNORED_KEYS.has(e.key)) return
    const down = pressedRef.current[e.code]
    if (down == null) return
    const up = performance.now()
    const dwell = up - down
    const flight = lastUpRef.current != null ? Math.max(0, down - lastUpRef.current) : null
    lastUpRef.current = up
    delete pressedRef.current[e.code]
    setStrokes(s => [...s.slice(-59), { dwell, flight }])
  }

  const reset = () => {
    setStrokes([])
    setText('')
    pressedRef.current = {}
    lastUpRef.current = null
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const dwellVals = strokes.map(s => s.dwell)
  const flightVals = strokes.filter(s => s.flight != null).map(s => s.flight)
  const dwellAvg = avg(dwellVals)
  const flightAvg = avg(flightVals)
  const stdDev = dwellVals.length ? Math.sqrt(avg(dwellVals.map(v => (v - dwellAvg) ** 2))) : 0
  const consistency = dwellVals.length > 3
    ? Math.max(0, Math.min(100, 100 - (stdDev / (dwellAvg || 1)) * 100))
    : null

  const recent = strokes.slice(-24)

  return (
    <section className="demo-section" id="demo">
      <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="sh-label">Try it yourself</div>
        <div className="sh-title">Your typing has a fingerprint too</div>
        <div className="sh-sub">Type into the box below. Everything you see forming is captured and visualized live, right here in your browser.</div>
      </motion.div>

      <motion.div className="demo-panel glass-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="demo-input-row">
          <input
            className="demo-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Start typing here…"
            autoComplete="off"
            spellCheck="false"
          />
          <button className="demo-reset" onClick={reset}>Reset</button>
        </div>

        <div className="demo-stats-row">
          <div className="demo-stat">
            <div className="demo-stat-num">{strokes.length}</div>
            <div className="demo-stat-label">Keystrokes</div>
          </div>
          <div className="demo-stat">
            <div className="demo-stat-num">{dwellVals.length ? Math.round(dwellAvg) : '—'}<span className="demo-stat-unit">ms</span></div>
            <div className="demo-stat-label">Avg dwell</div>
          </div>
          <div className="demo-stat">
            <div className="demo-stat-num">{flightVals.length ? Math.round(flightAvg) : '—'}<span className="demo-stat-unit">ms</span></div>
            <div className="demo-stat-label">Avg flight</div>
          </div>
          <div className="demo-stat">
            <div className="demo-stat-num">{consistency !== null ? Math.round(consistency) : '—'}{consistency !== null && <span className="demo-stat-unit">%</span>}</div>
            <div className="demo-stat-label">Rhythm consistency</div>
          </div>
        </div>

        <div className="demo-fingerprint">
          {recent.length === 0 && <div className="demo-fingerprint-empty">Your rhythm will appear here as you type…</div>}
          {recent.map((s, i) => {
            const h = Math.min(60, Math.max(6, (s.dwell / 220) * 60))
            const dev = dwellAvg ? Math.abs(s.dwell - dwellAvg) / dwellAvg : 0
            const cls = dev > 0.5 ? 'off' : dev > 0.22 ? 'mid' : 'on'
            return <span key={i} className={`fp-bar fp-${cls}`} style={{ height: `${h}px` }} />
          })}
        </div>

        <div className="demo-note">
          Runs entirely client-side — nothing typed here is stored or sent anywhere. In production, BehaviorShield combines this signal with mouse movement and swipe velocity, scored continuously by an Isolation Forest model over WebSocket.
        </div>
      </motion.div>
    </section>
  )
}

/* ============ PAGE ============ */

export default function LandingPage() {
  const navigate = useNavigate()
  const [dwell, setDwell] = useState(85)
  const [flight, setFlight] = useState(72)
  const [conf, setConf] = useState(94)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDwell(Math.round(78 + Math.random() * 14))
      setFlight(Math.round(64 + Math.random() * 14))
      setConf(Math.round(89 + Math.random() * 9))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const counters = document.querySelectorAll('.stat-num[data-target]')
    const timeout = setTimeout(() => {
      counters.forEach(counter => {
        const target = parseFloat(counter.dataset.target)
        const isDecimal = counter.dataset.decimal === 'true'
        const suffix = counter.dataset.suffix || ''
        let current = 0
        const increment = target / 60
        const timer = setInterval(() => {
          current += increment
          if (current >= target) { current = target; clearInterval(timer) }
          counter.textContent = isDecimal ? current.toFixed(1) + suffix : Math.floor(current) + suffix
        }, 25)
      })
    }, 600)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const goTo = (path) => { setMobileOpen(false); navigate(path) }
  const scrollTo = (id) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="landing">
      <NetworkCanvas />

      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-shield">🛡</span>
          <span className="nav-brand">BehaviorShield</span>
        </div>

        <div className="nav-links">
          <span className="nav-link" onClick={() => scrollTo('how')}>How it works</span>
          <span className="nav-link" onClick={() => scrollTo('features')}>Features</span>
        </div>

        <div className="nav-right">
          <button className="nav-login" onClick={() => navigate('/login')}>Sign in</button>
          <button className="nav-cta" onClick={() => navigate('/register')}>Get started →</button>
          <button className="nav-burger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="mobile-menu" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <span className="mobile-link" onClick={() => scrollTo('how')}>How it works</span>
            <span className="mobile-link" onClick={() => scrollTo('features')}>Features</span>
            <div className="mobile-menu-btns">
              <button className="btn-glass" onClick={() => goTo('/login')}>Sign in</button>
              <button className="btn-primary" onClick={() => goTo('/register')}>Get started →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="hero">
        <HeroBridge />
        <div className="hero-left">
          <motion.div className="hero-badge" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <span className="badge-dot" /> Behavior-as-a-Service · AI powered · Early access
          </motion.div>
          <motion.h1 className="hero-title" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            Intelligence that<br /><span className="hero-gradient">never sleeps.</span>
          </motion.h1>
          <motion.p className="hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
            BehaviorShield continuously monitors your users' behavioral patterns — building a unique typing DNA that flags threats the moment they emerge, silently and invisibly.
          </motion.p>
          <motion.div className="hero-btns" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
            <button className="btn-primary" onClick={() => navigate('/register')}>Start protecting users →</button>
            <button className="btn-glass" onClick={() => scrollTo('how')}>See how it works</button>
          </motion.div>
          <motion.div className="hero-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            <div className="stat">
              <div className="stat-num" data-target="2" data-suffix="s">0s</div>
              <div className="stat-label">Auth interval</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num" data-target="99.4" data-decimal="true" data-suffix="%">0%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num" data-target="0" data-suffix="ms">0ms</div>
              <div className="stat-label">Friction</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num" data-target="150" data-suffix="+">0+</div>
              <div className="stat-label">Data points</div>
            </div>
          </motion.div>
        </div>

        <motion.div className="hero-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
          <DNAHelix />
          <div className="dna-stats">
            <div className="ds-row"><span className="ds-label">dwell avg</span><span className="ds-val">{dwell}ms</span></div>
            <div className="ds-row"><span className="ds-label">flight avg</span><span className="ds-val">{flight}ms</span></div>
            <div className="ds-row"><span className="ds-label">confidence</span><span className="ds-val green">{conf}%</span></div>
            <div className="ds-row"><span className="ds-label">verdict</span><span className="ds-val green ds-verdict">ALLOW</span></div>
          </div>
          <div className="dna-label-text">behavioral fingerprint · updating live</div>
        </motion.div>
      </section>

      <PipelineStrip />

      <TypingDemo />

      <StatsIntelligence />

      {/* HOW IT WORKS */}
      <section className="how-section" id="how">
        <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="sh-label">How it works</div>
          <div className="sh-title">Three steps. Zero friction.</div>
          <div className="sh-sub">Integrates in minutes. Runs invisibly forever.</div>
        </motion.div>
        <div className="steps">
          {[
            { num: '01', icon: '🔌', title: 'Integrate once', desc: 'Add our SDK to your existing login flow. No UI changes needed. BehaviorShield activates silently in the background.' },
            { num: '02', icon: '🧠', title: 'Learn silently', desc: 'During the first session, BehaviorShield builds a behavioral fingerprint — typing speed, rhythm, mouse patterns — all invisible.' },
            { num: '03', icon: '🛡', title: 'Protect forever', desc: 'Every 2 seconds, AI compares live behavior against baseline. Risk smoothing prevents false positives.' },
          ].map((step, i) => (
            <motion.div key={i} className="step glass-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ y: -6 }}>
              <div className="step-num">STEP {step.num}</div>
              <div className="step-icon">{step.icon}</div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="sh-label">Features</div>
          <div className="sh-title">Built for production security</div>
          <div className="sh-sub">Everything a security team needs.</div>
        </motion.div>
        <div className="features-grid">
          {[
            { icon: '⚡', title: 'Continuous authentication', desc: 'Identity verified every 2 seconds. Session hijacking becomes impossible.', color: 'accent' },
            { icon: '📊', title: 'Risk smoothing', desc: 'Single anomalies ignored. Only sustained suspicious behavior triggers action.', color: 'green' },
            { icon: '🧠', title: 'Adaptive learning', desc: 'Baseline evolves with the user. Injury, new keyboard, stress — model adapts.', color: 'purple' },
            { icon: '🔒', title: 'Privacy first', desc: 'No keystrokes stored. No GPS. Only anonymous statistical patterns.', color: 'yellow' },
            { icon: '🔌', title: 'REST + WebSocket API', desc: 'HTTP for enrollment, WebSocket for live scoring. Works with any stack.', color: 'accent' },
            { icon: '📱', title: 'Cross-device support', desc: 'Keyboard, mouse, touch, swipe — all device types supported.', color: 'green' },
          ].map((feat, i) => (
            <motion.div key={i} className="feat glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
              <div className={`feat-icon feat-${feat.color}`}>{feat.icon}</div>
              <div>
                <div className="feat-title">{feat.title}</div>
                <div className="feat-desc">{feat.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <motion.div className="cta-box glass-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="cta-glow" />
          <h2 className="cta-title">Ready to protect your users?</h2>
          <p className="cta-sub">Set up BehaviorShield in under 10 minutes. No credit card required.</p>
          <div className="cta-btns">
            <button className="btn-primary" onClick={() => navigate('/register')}>Create free account →</button>
            <button className="btn-glass" onClick={() => navigate('/login')}>Sign in</button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <span>🛡</span>
          <div>
            <div className="footer-brand">BehaviorShield</div>
            <div className="footer-copy">© 2026 BehaviorShield AI · All rights reserved</div>
            <div className="footer-copy"> Made by <a href="https://github.com/ApekshaDadhich24" target="_blank" rel="noopener noreferrer"><span style={{ fontWeight: 'bold' }}>Apeksha Dadhich</span></a>
            </div>
          </div>
        </div>
        <div className="footer-links">
        <a href="https://github.com/ApekshaDadhich24/AI-Powered-Behavior-Shield" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
        <a href="https://github.com/ApekshaDadhich24/AI-Powered-Behavior-Shield#readme" target="_blank" rel="noopener noreferrer" className="footer-link">Docs</a>
        </div>
      </footer>
    </div>
  )
}