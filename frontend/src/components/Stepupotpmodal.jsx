import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BACKEND_URL } from '../config'

const RESEND_COOLDOWN_S = 30


export default function StepUpOtpModal({ open, userId, onVerified, onCancel }) {
  const [stage, setStage] = useState('sending') 
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef(null)
  const inputRef = useRef(null)

  const requestOtp = async () => {
    setStage('sending')
    setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/step-up/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setStage('input')
      setCooldown(RESEND_COOLDOWN_S)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err) {
      setError(err.message || 'Could not send verification code. Check your connection.')
      setStage('error')
    }
  }

  useEffect(() => {
    if (!open) return
    setCode('')
    requestOtp()
    
  }, [open, userId])

  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => clearInterval(cooldownRef.current)
  }, [cooldown])

  const handleVerify = async (e) => {
    e.preventDefault()
    if (code.length !== 6 || stage === 'verifying') return
    setStage('verifying')
    setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/step-up/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setStage('locked')
          setError(data.error || 'Too many attempts.')
          return
        }
        setError(data.error || 'Invalid code')
        setStage('input')
        setCode('')
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }
      onVerified?.(data)
    } catch (err) {
      setError('Could not reach the server. Please try again.')
      setStage('input')
    }
  }

  const handleCodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="otp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(5,7,12,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              width: '100%', maxWidth: 400, background: '#0f172a',
              border: '1px solid rgba(148,163,184,0.18)', borderRadius: 16,
              padding: '32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18 }}>Verify it's you</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
              Your last session ended due to unusual behavior. Enter the 6-digit code we sent to your email to continue signing in.
            </p>

            {stage === 'sending' && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 14 }}>
                Sending verification code…
              </div>
            )}

            {(stage === 'input' || stage === 'verifying') && (
              <form onSubmit={handleVerify}>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  disabled={stage === 'verifying'}
                  style={{
                    width: '100%', boxSizing: 'border-box', fontSize: 26,
                    letterSpacing: 10, textAlign: 'center', fontWeight: 700,
                    padding: '14px 0', borderRadius: 10,
                    border: `1px solid ${error ? '#f43f5e' : 'rgba(148,163,184,0.25)'}`,
                    background: '#0b1120', color: '#f1f5f9', marginBottom: 8,
                  }}
                />
                {error && (
                  <div style={{ color: '#fb7185', fontSize: 13, marginBottom: 8 }}>{error}</div>
                )}
                <button
                  type="submit"
                  disabled={code.length !== 6 || stage === 'verifying'}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                    background: code.length === 6 ? '#3b82f6' : 'rgba(59,130,246,0.35)',
                    color: '#fff', fontWeight: 600, fontSize: 14.5,
                    cursor: code.length === 6 ? 'pointer' : 'not-allowed',
                    marginTop: 4,
                  }}
                >
                  {stage === 'verifying' ? 'Verifying…' : 'Verify'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => onCancel?.()}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, cursor: 'pointer', padding: 0 }}
                  >
                    Back to login
                  </button>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={cooldown > 0}
                    style={{
                      background: 'none', border: 'none', fontSize: 12.5, padding: 0,
                      color: cooldown > 0 ? '#475569' : '#60a5fa',
                      cursor: cooldown > 0 ? 'default' : 'pointer',
                    }}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {stage === 'error' && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ color: '#fb7185', fontSize: 13.5, marginBottom: 14 }}>{error}</div>
                <button
                  onClick={requestOtp}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: '#3b82f6', color: '#fff', fontWeight: 600,
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {stage === 'locked' && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ color: '#fb7185', fontSize: 13.5, marginBottom: 14 }}>
                  {error || 'Too many failed attempts.'} Please try again later.
                </div>
                <button
                  onClick={() => onCancel?.()}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: '#f43f5e', color: '#fff', fontWeight: 600,
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Back to login
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}