import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BACKEND_URL } from '../config'
import AuthVisualPanel from './AuthVisual'
import StepUpOtpModal from '../components/StepUpOtpModal'
import './AuthPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // When a login response comes back with requiresStepUp: true, we stash
  // the userId here and show the OTP modal instead of navigating in.
  const [pendingStepUpUserId, setPendingStepUpUserId] = useState(null)

  const justRegistered = location.state?.registered

  const completeLogin = ({ userId, username, is_enrolled }) => {
    login({ userId, username, is_enrolled })
    navigate(is_enrolled ? '/dashboard' : '/enroll')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Invalid username or password.')
        return
      }

      // Password was correct, but this account was force-logged-out for
      // anomalous behavior and needs OTP verification before a session
      // is granted. Don't log them in yet — show the modal instead.
      if (data.requiresStepUp) {
        setPendingStepUpUserId(data.userId)
        return
      }

      completeLogin(data)
    } catch (err) {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/" className="auth-back">
          <span className="auth-back-arrow">←</span> Back to home
        </Link>

        <div className="auth-form-wrap">
          <div className="auth-eyebrow">— Secure access</div>
          <div className="auth-title">Sign in to BehaviorShield</div>
          <div className="auth-sub">
            Don't have an account? <Link to="/register" className="auth-switch-link">Create one here</Link>
          </div>

          {justRegistered && (
            <div className="auth-success">Account created — sign in to continue.</div>
          )}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="auth-input"
                type="text"
                autoComplete="username"
                placeholder="yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>

      <AuthVisualPanel
        heading={<>Your session,<br /><span className="auth-right-grad">continuously verified.</span></>}
        sub="No passwords typed twice. No waiting on a code. Just the way you already type and move."
      />

      <StepUpOtpModal
        open={!!pendingStepUpUserId}
        userId={pendingStepUpUserId}
        onVerified={(data) => {
          setPendingStepUpUserId(null)
          completeLogin(data)
        }}
        onCancel={() => setPendingStepUpUserId(null)}
      />
    </div>
  )
}