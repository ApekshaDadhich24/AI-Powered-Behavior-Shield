import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import AuthVisualPanel from './AuthVisual'
import './AuthPage.css'


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


export default function RegisterPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('') 
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    
    const trimmedEmail = email.trim()
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
   
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, email: trimmedEmail, password }), // --- NEW: email included ---
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Registration failed.')
        return
      }

      navigate('/login', { state: { registered: true } })
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
          <div className="auth-eyebrow">— New profile</div>
          <div className="auth-title">Create your account</div>
          <div className="auth-sub">
            Already have an account? <Link to="/login" className="auth-switch-link">Sign in</Link>
          </div>

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
              <div className="auth-hint">At least 3 characters. Stored lowercase.</div>
            </div>
            
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="auth-hint">Used to verify it's you if we ever detect unusual activity.</div>
            </div>
            
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="auth-hint">At least 6 characters.</div>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>
        </div>
      </div>

      <AuthVisualPanel
        heading={<>A profile built from<br /><span className="auth-right-grad">how you behave.</span></>}
        sub="Your first session teaches the model your rhythm. Every one after that, it checks you're still you."
      />
    </div>
  )
}