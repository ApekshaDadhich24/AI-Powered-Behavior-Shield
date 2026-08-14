import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useBehavior } from '../hooks/useBehavior'
import { BACKEND_URL } from '../config'

const WS_URL = BACKEND_URL.replace(/^http/, 'ws')
const SEND_INTERVAL_MS = 2000
const RECONNECT_DELAY_MS = 3000
const GOOD_VERDICT = 'CLEAR'
const SCORE_HISTORY_MAX = 40


const WARNING_TRIGGER_FRAMES = 5

const BehaviorSocketContext = createContext(null)

export function BehaviorSocketProvider({ children }) {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const { getEvents, clearEvents, attachListeners } = useBehavior()

  const [status, setStatus] = useState('connecting')
  const [trustScore, setTrustScore] = useState(null)
  const [riskScore, setRiskScore] = useState(null)
  const [avgRiskScore, setAvgRiskScore] = useState(null)
  const [riskWindowSize, setRiskWindowSize] = useState(null)
  const [decision, setDecision] = useState(null)
  const [consecutiveBad, setConsecutiveBad] = useState(0)
  const [rawVerdict, setRawVerdict] = useState(null)
  const [logs, setLogs] = useState([])
  const [scoreHistory, setScoreHistory] = useState([])
  const [lockoutReason, setLockoutReason] = useState(null)
  const [signals, setSignals] = useState({ keys: 0, mouseMoves: 0, mouseClicks: 0, keysActive: false, mouseActive: false })
  const [showWarning, setShowWarning] = useState(false)
  const warningDismissedRef = useRef(false)

  const wsRef = useRef(null)

  
  useEffect(() => {
    const detach = attachListeners(document)
    return () => { if (detach) detach() }
  }, [attachListeners])

  useEffect(() => {
    if (status !== 'live') {
      setShowWarning(false)
      return
    }
    if (consecutiveBad === 0) {
      warningDismissedRef.current = false
      setShowWarning(false)
      return
    }
    if (consecutiveBad >= WARNING_TRIGGER_FRAMES && !warningDismissedRef.current) {
      setShowWarning(true)
    }
  }, [consecutiveBad, status])

  useEffect(() => {
    if (!user?.userId) return
    if (!user?.is_enrolled) return
    if (wsRef.current) return

    let ws
    let sendInterval
    let reconnectTimer
    let closedByUs = false

    const lockdown = (reason) => {
      closedByUs = true
      clearInterval(sendInterval)
      clearTimeout(reconnectTimer)
      setStatus('locked')
      setLockoutReason(reason || 'Session terminated due to anomalous behavior.')
      if (wsRef.current) wsRef.current.close(1000, 'force_logout')
      setTimeout(() => {
        logout?.()
        navigate('/login', { replace: true })
      }, 2500)
    }

    const connect = () => {
      setStatus('connecting')
      clearEvents()
      ws = new WebSocket(`${WS_URL}/ws/auth/${user.userId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('live')
        sendInterval = setInterval(() => {
          const now = Date.now()
          const events = getEvents().filter(e => now - e.timestamp <= SEND_INTERVAL_MS)

          const keydownCount = events.filter(e => e.type === 'key_down').length
          const mouseMoveCount = events.filter(e => e.type === 'mouse_move').length
          const mouseClickCount = events.filter(e => e.type === 'mouse_down').length

          setSignals({
            keys: keydownCount,
            mouseMoves: mouseMoveCount,
            mouseClicks: mouseClickCount,
            keysActive: keydownCount > 0,
            mouseActive: mouseMoveCount > 0 || mouseClickCount > 0,
          })

          if (keydownCount >= 3 && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              events,
              context: {
                km_from_last_login: 0,
                hours_since_last_login: 1,
                is_trusted_device: true,
              },
            }))
          }
          clearEvents()
        }, SEND_INTERVAL_MS)
      }

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)

          if (data.status === 'CONNECTED') return
          if (data.status === 'WAITING') return
          if (data.action === 'FORCE_LOGOUT') {
            lockdown(data.reason)
            return
          }
          if (data.status !== 'PROCESSED') return

          const score = data.trust_score ?? data.behavior_confidence ?? null
          const dec = data.decision ?? GOOD_VERDICT

          setTrustScore(score)
          setRiskScore(data.risk_score ?? null)
          setAvgRiskScore(data.avg_risk_score ?? null)
          setRiskWindowSize(data.risk_window_size ?? null)
          setDecision(dec)
          setConsecutiveBad(data.consecutive_bad ?? 0)
          setRawVerdict(data.raw_verdict ?? null)
          setLogs((prev) => [
            { id: `${Date.now()}-${Math.random()}`, time: new Date(), score, decision: dec, raw: data.raw_verdict ?? null, avgRisk: data.avg_risk_score ?? null },
            ...prev,
          ].slice(0, 8))
          setScoreHistory((prev) => [...prev, score ?? 0].slice(-SCORE_HISTORY_MAX))
        } catch (err) {
          
        }
      }

      ws.onclose = () => {
        clearInterval(sendInterval)
        if (!closedByUs) {
          setStatus('reconnecting')
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => {
        setStatus('error')
      }
    }

    connect()

 
    return () => {
      closedByUs = true
      clearInterval(sendInterval)
      clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user?.userId, user?.is_enrolled, getEvents, clearEvents, logout, navigate])

  const dismissWarning = useCallback(() => {
    warningDismissedRef.current = true
    setShowWarning(false)
  }, [])

  const value = {
    status, trustScore, riskScore, avgRiskScore, riskWindowSize,
    decision, consecutiveBad, rawVerdict, logs, scoreHistory,
    lockoutReason, signals, showWarning, dismissWarning,
  }

  return (
    <BehaviorSocketContext.Provider value={value}>
      {children}
    </BehaviorSocketContext.Provider>
  )
}

export function useBehaviorSocket() {
  const ctx = useContext(BehaviorSocketContext)
  if (!ctx) throw new Error('useBehaviorSocket must be used within BehaviorSocketProvider')
  return ctx
}