import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { BACKEND_URL } from '../config'

const GOOD_VERDICT = 'CLEAR'
const INCIDENT_REASONS = ['force_logout_ai', 'force_logout_sustained']

const END_REASON_META = {
  normal:                 { label: 'Ended normally',        tone: 'good' },
  force_logout_sustained: { label: 'Force logged out',      tone: 'bad'  },
  force_logout_ai:        { label: 'Force logged out (AI)', tone: 'bad'  },
  ai_unavailable:         { label: 'AI unavailable',        tone: 'warn' },
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function scoreColor(score) {
  if (score == null) return '#94a3b8'
  return score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#f43f5e'
}

function EndReasonBadge({ session }) {
  const isActive = !session.endedAt
  if (isActive) {
    return <span className="sa-badge sa-badge-live">● Active</span>
  }
  const meta = END_REASON_META[session.endReason] || { label: session.endReason || 'Unknown', tone: 'warn' }
  return <span className={`sa-badge sa-badge-${meta.tone}`}>{meta.label}</span>
}

// ============ #6 — Aggregate stats bar ============
function AggregateStats({ sessions }) {
  const stats = useMemo(() => {
    const total = sessions.length
    const scored = sessions.filter((s) => s.avgTrustScore != null)
    const overallAvg = scored.length ? scored.reduce((a, s) => a + s.avgTrustScore, 0) / scored.length : null
    const incidents = sessions.filter((s) => INCIDENT_REASONS.includes(s.endReason)).length
    const totalFrames = sessions.reduce((a, s) => a + (s.frameCount ?? 0), 0)
    return { total, overallAvg, incidents, totalFrames }
  }, [sessions])

  return (
    <div className="lm-card sa-aggregate-bar">
      <div className="sa-agg-stat">
        <span className="sa-agg-val">{stats.total}</span>
        <span className="sa-agg-label">Sessions (last 50)</span>
      </div>
      <div className="sa-agg-stat">
        <span className="sa-agg-val" style={{ color: scoreColor(stats.overallAvg) }}>
          {stats.overallAvg == null ? '—' : `${Math.round(stats.overallAvg)}%`}
        </span>
        <span className="sa-agg-label">Overall avg trust</span>
      </div>
      <div className="sa-agg-stat">
        <span className="sa-agg-val" style={{ color: stats.incidents > 0 ? '#f43f5e' : undefined }}>{stats.incidents}</span>
        <span className="sa-agg-label">Force-logout incidents</span>
      </div>
      <div className="sa-agg-stat">
        <span className="sa-agg-val">{stats.totalFrames}</span>
        <span className="sa-agg-label">Total frames scored</span>
      </div>
    </div>
  )
}

// ============ #2 — Calendar heatmap ============
function CalendarHeatmap({ sessions }) {
  const dayMap = useMemo(() => {
    const map = {}
    sessions.forEach((s) => {
      if (s.avgTrustScore == null) return
      const day = new Date(s.startedAt).toISOString().slice(0, 10)
      if (!map[day]) map[day] = { sum: 0, count: 0 }
      map[day].sum += s.avgTrustScore
      map[day].count += 1
    })
    return map
  }, [sessions])

  const days = useMemo(() => {
    const arr = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 69; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const entry = dayMap[key]
      arr.push({ key, date: d, avg: entry ? entry.sum / entry.count : null })
    }
    return arr
  }, [dayMap])

  const firstDow = days[0]?.date.getDay() ?? 0
  const padded = [...Array(firstDow).fill(null), ...days]

  const cellColor = (avg) => {
    if (avg == null) return 'rgba(255,255,255,0.05)'
    if (avg >= 80) return '#22c55e'
    if (avg >= 60) return '#84cc16'
    if (avg >= 40) return '#f59e0b'
    return '#f43f5e'
  }

  return (
    <div className="sa-heatmap">
      <div className="sa-heatmap-grid">
        {padded.map((d, i) => (
          <div
            key={i}
            className="sa-heatmap-cell"
            style={{ background: d ? cellColor(d.avg) : 'transparent' }}
            title={d ? `${d.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}: ${d.avg == null ? 'No sessions' : Math.round(d.avg) + '% avg trust'}` : ''}
          />
        ))}
      </div>
      <div className="sa-heatmap-legend">
        <span>Lower trust</span>
        <span className="sa-heatmap-swatch" style={{ background: '#f43f5e' }} />
        <span className="sa-heatmap-swatch" style={{ background: '#f59e0b' }} />
        <span className="sa-heatmap-swatch" style={{ background: '#84cc16' }} />
        <span className="sa-heatmap-swatch" style={{ background: '#22c55e' }} />
        <span>Higher trust</span>
      </div>
    </div>
  )
}

function SessionListItem({ session, active, onClick }) {
  const started = new Date(session.startedAt)
  const duration = session.endedAt
    ? new Date(session.endedAt) - started
    : Date.now() - started

  return (
    <button className={`sa-session-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="sa-session-item-top">
        <span className="sa-session-date">
          {started.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          {' · '}
          {started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <EndReasonBadge session={session} />
      </div>
      <div className="sa-session-item-bottom">
        <span className="sa-session-stat">
          <b style={{ color: scoreColor(session.avgTrustScore) }}>
            {session.avgTrustScore == null ? '—' : Math.round(session.avgTrustScore)}%
          </b> avg trust
        </span>
        <span className="sa-session-stat">{formatDuration(duration)}</span>
        <span className="sa-session-stat">{session.frameCount ?? 0} frames</span>
        {session.anomalyCount > 0 && (
          <span className="sa-session-stat sa-session-anomaly">{session.anomalyCount} anomal{session.anomalyCount === 1 ? 'y' : 'ies'}</span>
        )}
      </div>
    </button>
  )
}

// ============ #7 — Timeline with anomaly-streak annotations ============
function TimelineChart({ events }) {
  const svgRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const w = 900, h = 200, pad = 24

  const points = useMemo(() => {
    if (!events.length) return []
    return events.map((e, i) => {
      const x = events.length === 1 ? pad : pad + (i / (events.length - 1)) * (w - pad * 2)
      const score = e.trustScore ?? 0
      const y = pad + (1 - Math.max(0, Math.min(100, score)) / 100) * (h - pad * 2)
      return { x, y, e }
    })
  }, [events])

  const handleMove = useCallback((evt) => {
    if (!svgRef.current || !points.length) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = ((evt.clientX - rect.left) / rect.width) * w
    let nearest = 0
    let best = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX)
      if (d < best) { best = d; nearest = i }
    })
    setHoverIdx(nearest)
  }, [points])

  if (!events.length) {
    return <div className="sa-chart-empty">No score events recorded for this session.</div>
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `M${pad},${h - pad} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${h - pad} Z`
  const hover = hoverIdx != null ? points[hoverIdx] : null
  const hoverIsAnomaly = hover && hover.e.decision && hover.e.decision !== GOOD_VERDICT

  return (
    <div className="sa-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="sa-chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="sa-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((g) => {
          const y = pad + (1 - g / 100) * (h - pad * 2)
          return (
            <g key={g}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
              <text x={2} y={y + 3} fontSize="9" fill="#64748b" fontFamily="var(--font-mono)">{g}</text>
            </g>
          )
        })}

        <path d={areaPath} fill="url(#sa-area-grad)" stroke="none" />
        <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => p.e.decision && p.e.decision !== GOOD_VERDICT && (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f43f5e" stroke="#0b0f1a" strokeWidth="1" />
        ))}

        {hover && (
          <line x1={hover.x} y1={pad} x2={hover.x} y2={h - pad} stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="3,3" />
        )}
        {hover && (
          <circle cx={hover.x} cy={hover.y} r={4.5} fill={scoreColor(hover.e.trustScore)} stroke="#0b0f1a" strokeWidth="1.5" />
        )}
      </svg>

      {hover && (
        <div className="sa-chart-tooltip" style={{ left: `${(hover.x / w) * 100}%` }}>
          <div className="sa-tooltip-time">{new Date(hover.e.timestamp).toLocaleTimeString([], { hour12: false })}</div>
          <div className="sa-tooltip-score" style={{ color: scoreColor(hover.e.trustScore) }}>
            {hover.e.trustScore == null ? '—' : `${Math.round(hover.e.trustScore)}%`}
          </div>
          <div className="sa-tooltip-decision">{hover.e.decision ?? '—'}{hover.e.rawVerdict && hover.e.rawVerdict !== hover.e.decision ? ` (raw: ${hover.e.rawVerdict})` : ''}</div>
          {hoverIsAnomaly && (
            <div className="sa-tooltip-anomaly">⚠ {hover.e.consecutiveBad ?? 0} consecutive bad frame{hover.e.consecutiveBad === 1 ? '' : 's'} at this point</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionAnalytics() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [incidentsOnly, setIncidentsOnly] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [expandedLogId, setExpandedLogId] = useState(null)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    setLoadingSessions(true)
    setSessionsError('')
    fetch(`${BACKEND_URL}/api/sessions/user/${user.userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = data.sessions ?? []
        setSessions(list)
        if (list.length > 0) setSelectedId(list[0]._id)
      })
      .catch(() => { if (!cancelled) setSessionsError('Could not load session history.') })
      .finally(() => { if (!cancelled) setLoadingSessions(false) })
    return () => { cancelled = true }
  }, [user?.userId])

  useEffect(() => {
    if (!selectedId) { setEvents([]); return }
    let cancelled = false
    setLoadingEvents(true)
    setEventsError('')
    fetch(`${BACKEND_URL}/api/sessions/${selectedId}/events`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setEvents(data.events ?? []) })
      .catch(() => { if (!cancelled) setEventsError('Could not load this session\u2019s timeline.') })
      .finally(() => { if (!cancelled) setLoadingEvents(false) })
    return () => { cancelled = true }
  }, [selectedId])

  const selectedSession = sessions.find((s) => s._id === selectedId)
  const recentEvents = useMemo(() => [...events].reverse().slice(0, 8), [events])

  // #4 — incident-only filter
  const filteredSessions = useMemo(() => {
    if (!incidentsOnly) return sessions
    return sessions.filter((s) => INCIDENT_REASONS.includes(s.endReason))
  }, [sessions, incidentsOnly])

  // #5 — export selected session as JSON
  const exportSession = () => {
    if (!selectedSession) return
    const payload = { session: selectedSession, events }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${selectedSession._id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sa-page">
      <AggregateStats sessions={sessions} />

      <div className="lm-card sa-heatmap-card">
        <div className="lm-card-title">Trust over time</div>
        <div className="sa-heatmap-sub">Daily average trust score, based on your last {sessions.length} sessions</div>
        <CalendarHeatmap sessions={sessions} />
      </div>

      <div className="sa-layout">
        <div className="lm-card sa-session-list-card">
          <div className="sa-list-header">
            <div className="lm-card-title" style={{ marginBottom: 0 }}>Session history</div>
            <button
              className={`sa-filter-toggle ${incidentsOnly ? 'on' : ''}`}
              onClick={() => setIncidentsOnly((v) => !v)}
            >
              {incidentsOnly ? '⚠ Incidents only' : 'Show incidents only'}
            </button>
          </div>
          {loadingSessions && <div className="sa-status-msg">Loading sessions…</div>}
          {sessionsError && <div className="sa-status-msg sa-error">{sessionsError}</div>}
          {!loadingSessions && !sessionsError && filteredSessions.length === 0 && (
            <div className="sa-status-msg">{incidentsOnly ? 'No incidents in your recent sessions.' : 'No sessions recorded yet.'}</div>
          )}
          <div className="sa-session-list">
            {filteredSessions.map((s) => (
              <SessionListItem
                key={s._id}
                session={s}
                active={s._id === selectedId}
                onClick={() => { setSelectedId(s._id); setExpandedLogId(null) }}
              />
            ))}
          </div>
        </div>

        <div className="sa-detail-col">
          {!selectedSession && !loadingSessions && (
            <div className="lm-card sa-detail-empty">
              <div className="dash-placeholder-icon">📈</div>
              <div className="dash-placeholder-title">Select a session</div>
              <div className="dash-placeholder-sub">Pick a session on the left to see its trust score timeline.</div>
            </div>
          )}

          {selectedSession && (
            <>
              <div className="lm-card sa-detail-header">
                <div className="sa-detail-stat">
                  <span className="sa-detail-stat-label">Avg trust</span>
                  <span className="sa-detail-stat-val" style={{ color: scoreColor(selectedSession.avgTrustScore) }}>
                    {selectedSession.avgTrustScore == null ? '—' : `${Math.round(selectedSession.avgTrustScore)}%`}
                  </span>
                </div>
                <div className="sa-detail-stat">
                  <span className="sa-detail-stat-label">Min trust</span>
                  <span className="sa-detail-stat-val" style={{ color: scoreColor(selectedSession.minTrustScore) }}>
                    {selectedSession.minTrustScore == null ? '—' : `${Math.round(selectedSession.minTrustScore)}%`}
                  </span>
                </div>
                <div className="sa-detail-stat">
                  <span className="sa-detail-stat-label">Frames</span>
                  <span className="sa-detail-stat-val">{selectedSession.frameCount ?? 0}</span>
                </div>
                <div className="sa-detail-stat">
                  <span className="sa-detail-stat-label">Anomalies</span>
                  <span className="sa-detail-stat-val" style={{ color: selectedSession.anomalyCount > 0 ? '#f43f5e' : undefined }}>
                    {selectedSession.anomalyCount ?? 0}
                  </span>
                </div>
                <div className="sa-detail-stat">
                  <span className="sa-detail-stat-label">Outcome</span>
                  <EndReasonBadge session={selectedSession} />
                </div>
                <button className="sa-export-btn" onClick={exportSession} disabled={!events.length}>
                  ⬇ Export JSON
                </button>
              </div>

              <div className="lm-card sa-chart-card">
                <div className="lm-card-title">Trust score timeline</div>
                {loadingEvents && <div className="sa-status-msg">Loading timeline…</div>}
                {eventsError && <div className="sa-status-msg sa-error">{eventsError}</div>}
                {!loadingEvents && !eventsError && <TimelineChart events={events} />}
              </div>

              <div className="lm-card lm-log-card">
                <div className="lm-log-title">Recent frames</div>
                <div className="lm-log-feed">
                  {recentEvents.length === 0 && !loadingEvents && (
                    <div className="lm-log-empty">No score events in this session.</div>
                  )}
                  <AnimatePresence initial={false}>
                    {recentEvents.map((ev, i) => {
                      const id = `${selectedId}-${i}`
                      const isOpen = expandedLogId === id
                      const allowed = ev.decision == null || ev.decision === GOOD_VERDICT
                      return (
                        <motion.div
                          key={id}
                          layout
                          className={`lm-log-line ${allowed ? 'tone-allow' : 'tone-warn'}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setExpandedLogId(isOpen ? null : id)}
                          style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="lm-log-time">{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                            <span className="lm-log-score">{ev.trustScore == null ? '—' : `${Math.round(ev.trustScore)}%`}</span>
                            <span className="lm-log-decision">{allowed ? 'ALLOW' : 'REVIEW'}</span>
                            {ev.rawVerdict && ev.rawVerdict !== ev.decision && <span className="lm-log-raw">raw: {ev.rawVerdict}</span>}
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
                                <div>Risk score: {ev.riskScore == null ? '—' : Math.round(ev.riskScore)}</div>
                                <div>Avg risk (10s): {ev.avgRiskScore == null ? '—' : Math.round(ev.avgRiskScore)}</div>
                                <div>Consecutive bad frames: {ev.consecutiveBad ?? 0}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}