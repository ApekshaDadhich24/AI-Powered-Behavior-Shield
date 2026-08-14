import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BACKEND_URL } from '../config'

const AVATAR_TARGET_PX = 200
const AVATAR_QUALITY = 0.7

const AVATAR_COLORS = ['#60a5fa', '#a78bfa', '#22d3ee', '#f59e0b', '#f43f5e', '#22c55e']

function initialsFor(username) {
  if (!username) return '?'
  return username.slice(0, 2).toUpperCase()
}

function colorFor(username) {
  if (!username) return AVATAR_COLORS[0]
  const sum = [...username].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_TARGET_PX
        canvas.height = AVATAR_TARGET_PX
        const ctx = canvas.getContext('2d')

       
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_TARGET_PX, AVATAR_TARGET_PX)

        resolve(canvas.toDataURL('image/jpeg', AVATAR_QUALITY))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="pf-toggle-row">
      <div className="pf-toggle-text">
        <div className="pf-toggle-label">{label}</div>
        {sub && <div className="pf-toggle-sub">{sub}</div>}
      </div>
      <button
        className={`pf-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className="pf-toggle-knob" />
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const [savingPrefs, setSavingPrefs] = useState(false)

  
  const [emailStep, setEmailStep] = useState('idle') 
  const [newEmail, setNewEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  
  const [pwStep, setPwStep] = useState('idle') 
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const [relBusy, setRelBusy] = useState(false)
  const [confirmRelogin, setConfirmRelogin] = useState(false)

  const [keyVisible, setKeyVisible] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  const loadProfile = useCallback(() => {
    if (!user?.userId) return
    setLoading(true)
    setError('')
    fetch(`${BACKEND_URL}/api/profile/${user.userId}`)
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false))
  }, [user?.userId])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    setAvatarUploading(true)
    try {
      const base64 = await compressImageToBase64(file)
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarBase64: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setProfile((p) => ({ ...p, avatarBase64: data.avatarBase64 }))
    } catch (err) {
      setAvatarError('Could not upload that image. Try a different one.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarClear = async () => {
    setAvatarUploading(true)
    setAvatarError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarBase64: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setProfile((p) => ({ ...p, avatarBase64: data.avatarBase64 }))
    } catch {
      setAvatarError('Could not remove your photo. Try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const togglePref = async (key, value) => {
    const next = { ...profile.alertPreferences, [key]: value }
    setProfile((p) => ({ ...p, alertPreferences: next }))
    setSavingPrefs(true)
    try {
      await fetch(`${BACKEND_URL}/api/profile/${user.userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertPreferences: next }),
      })
    } catch {
      
    } finally {
      setSavingPrefs(false)
    }
  }

  
  const requestEmailChange = async () => {
    if (!newEmail.trim()) return
    setEmailBusy(true)
    setEmailMsg('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/change-email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setProfile((p) => ({ ...p, pendingEmail: newEmail.trim().toLowerCase() }))
      setEmailStep('code')
      setEmailMsg('Verification code sent to your new email.')
    } catch (err) {
      setEmailMsg(err.message || 'Could not send verification code.')
    } finally {
      setEmailBusy(false)
    }
  }

  const verifyEmailChange = async () => {
    if (!otpCode.trim()) return
    setEmailBusy(true)
    setEmailMsg('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/change-email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setProfile((p) => ({ ...p, email: data.email, pendingEmail: null }))
      setEmailStep('idle')
      setNewEmail('')
      setOtpCode('')
      setEmailMsg('Email updated.')
    } catch (err) {
      setEmailMsg(err.message || 'Invalid or expired code.')
    } finally {
      setEmailBusy(false)
    }
  }

  const cancelEmailChange = () => {
    setEmailStep('idle')
    setNewEmail('')
    setOtpCode('')
    setEmailMsg('')
  }

  
  const submitPasswordChange = async () => {
    setPwMsg('')
    if (newPw.length < 8) {
      setPwMsg('New password must be at least 8 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg('New passwords do not match.')
      return
    }
    setPwBusy(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update password')
      setProfile((p) => ({ ...p, passwordChangedAt: data.passwordChangedAt }))
      setPwStep('idle')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg('Password updated.')
    } catch (err) {
      setPwMsg(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  const cancelPasswordChange = () => {
    setPwStep('idle')
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setPwMsg('')
  }

  
  const handleForceRelogin = async () => {
    if (!confirmRelogin) {
      setConfirmRelogin(true)
      return
    }
    setRelBusy(true)
    try {
      await fetch(`${BACKEND_URL}/api/profile/${user.userId}/force-relogin`, { method: 'POST' })
    } catch {
      
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  
  const handleRegenerateKey = async () => {
    setRegenBusy(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${user.userId}/regenerate-key`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setProfile((p) => ({ ...p, apiKey: data.apiKey }))
    } catch {
      
    } finally {
      setRegenBusy(false)
    }
  }

  const copyKey = () => {
    if (!profile?.apiKey) return
    navigator.clipboard.writeText(profile.apiKey)
    setCopyMsg('Copied')
    setTimeout(() => setCopyMsg(''), 1500)
  }

  if (loading) {
    return <div className="sa-status-msg">Loading profile…</div>
  }
  if (error || !profile) {
    return <div className="sa-status-msg sa-error">{error || 'Profile unavailable.'}</div>
  }

  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  const pwLastChanged = profile.passwordChangedAt
    ? new Date(profile.passwordChangedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never changed'

  return (
    <div className="pf-page">
      
      <motion.div className="lm-card pf-identity-card" variants={cardVariants} initial="hidden" animate="show">
        <div className="pf-avatar-wrap">
          {profile.avatarBase64 ? (
            <img src={profile.avatarBase64} alt="Profile" className="pf-avatar-img" />
          ) : (
            <div className="pf-avatar-initials" style={{ background: colorFor(profile.username) }}>
              {initialsFor(profile.username)}
            </div>
          )}
          <button className="pf-avatar-edit-btn" onClick={handleAvatarPick} disabled={avatarUploading}>
            {avatarUploading ? '…' : '✎'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        <div className="pf-identity-body">
          <div className="pf-identity-name">{profile.username}</div>
          <div className="pf-identity-email">
            {profile.email}
            <span className="sa-badge sa-badge-good" style={{ marginLeft: 8 }}>✓ Verified</span>
          </div>
          <div className="pf-identity-joined">Member since {joined}</div>
          {profile.avatarBase64 && (
            <button className="pf-link-btn" onClick={handleAvatarClear} disabled={avatarUploading}>
              Remove photo
            </button>
          )}
          {avatarError && <div className="pf-inline-error">{avatarError}</div>}
        </div>
      </motion.div>

     
      <motion.div className="lm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
        <div className="lm-card-title">Behavioral baseline</div>
        <div className="pf-baseline-row">
          <div className="pf-baseline-status">
            <span className={`sa-badge ${profile.is_enrolled ? 'sa-badge-good' : 'sa-badge-warn'}`}>
              {profile.is_enrolled ? '✓ Enrolled' : '⚠ Not enrolled'}
            </span>
          </div>
          <button
            className="pf-secondary-btn"
            onClick={() => {
              updateUser({ is_enrolled: false })
              navigate('/enroll')
            }}
          >
            Re-enroll baseline
          </button>
        </div>
        <div className="pf-baseline-signals">
          <div className="pf-baseline-signal-label">Signals tracked in your baseline</div>
          <div className="pf-baseline-chips">
            <span className="pf-chip">⌨ Keyboard rhythm</span>
            <span className="pf-chip">🖱 Mouse movement</span>
          </div>
        </div>
      </motion.div>

     
      <motion.div className="lm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
        <div className="lm-card-title">Security &amp; alerts</div>
        <ToggleRow
          label="Email me on forced logout"
          sub="Sent when a session is terminated for anomalous behavior"
          checked={profile.alertPreferences?.emailOnForceLogout ?? true}
          onChange={(v) => togglePref('emailOnForceLogout', v)}
        />
        <ToggleRow
          label="Email me when step-up verification triggers"
          sub="Sent whenever a login requires OTP confirmation"
          checked={profile.alertPreferences?.emailOnStepUp ?? true}
          onChange={(v) => togglePref('emailOnStepUp', v)}
        />
        {savingPrefs && <div className="pf-saving-hint">Saving…</div>}
      </motion.div>

     
      <motion.div className="lm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
        <div className="lm-card-title">Account</div>

        {/* Email */}
        <div className="pf-account-row">
          <div className="pf-account-row-text">
            <div className="pf-account-row-label">Email address</div>
            <div className="pf-account-row-sub">
              {emailStep === 'code' ? `Verifying change to ${profile.pendingEmail}` : profile.email}
            </div>
          </div>
          {emailStep === 'idle' && (
            <button className="pf-secondary-btn" onClick={() => setEmailStep('editing')}>Change</button>
          )}
        </div>

        {emailStep === 'editing' && (
          <div className="pf-inline-form">
            <input
              type="email"
              className="pf-input"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <div className="pf-inline-form-actions">
              <button className="pf-primary-btn" onClick={requestEmailChange} disabled={emailBusy || !newEmail.trim()}>
                {emailBusy ? 'Sending…' : 'Send code'}
              </button>
              <button className="pf-link-btn" onClick={cancelEmailChange}>Cancel</button>
            </div>
          </div>
        )}

        {emailStep === 'code' && (
          <div className="pf-inline-form">
            <input
              type="text"
              className="pf-input"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
            />
            <div className="pf-inline-form-actions">
              <button className="pf-primary-btn" onClick={verifyEmailChange} disabled={emailBusy || !otpCode.trim()}>
                {emailBusy ? 'Verifying…' : 'Verify'}
              </button>
              <button className="pf-link-btn" onClick={cancelEmailChange}>Cancel</button>
            </div>
          </div>
        )}

        {emailMsg && <div className="pf-inline-msg">{emailMsg}</div>}

       
        <div className="pf-account-row" style={{ marginTop: 18 }}>
          <div className="pf-account-row-text">
            <div className="pf-account-row-label">Password</div>
            <div className="pf-account-row-sub">Last changed: {pwLastChanged}</div>
          </div>
          {pwStep === 'idle' && (
            <button className="pf-secondary-btn" onClick={() => setPwStep('editing')}>Change</button>
          )}
        </div>

        {pwStep === 'editing' && (
          <div className="pf-inline-form">
            <input
              type="password"
              className="pf-input"
              placeholder="Current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
            <input
              type="password"
              className="pf-input"
              placeholder="New password (min 8 characters)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <input
              type="password"
              className="pf-input"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
            <div className="pf-inline-form-actions">
              <button
                className="pf-primary-btn"
                onClick={submitPasswordChange}
                disabled={pwBusy || !currentPw || !newPw || !confirmPw}
              >
                {pwBusy ? 'Updating…' : 'Update password'}
              </button>
              <button className="pf-link-btn" onClick={cancelPasswordChange}>Cancel</button>
            </div>
          </div>
        )}

        {pwMsg && <div className="pf-inline-msg">{pwMsg}</div>}

     
        <div className="pf-account-row" style={{ marginTop: 18 }}>
          <div className="pf-account-row-text">
            <div className="pf-account-row-label">Force re-login</div>
            <div className="pf-account-row-sub">
              Ends your local session now and requires OTP verification on next login.
            </div>
          </div>
          <button
            className={`pf-secondary-btn ${confirmRelogin ? 'pf-danger' : ''}`}
            onClick={handleForceRelogin}
            disabled={relBusy}
          >
            {relBusy ? 'Working…' : confirmRelogin ? 'Confirm — log out' : 'Force re-login'}
          </button>
        </div>
      </motion.div>

      
      <motion.div className="lm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
        <div className="lm-card-title">Developer integration</div>
        <div className="pf-dev-sub">Use this key to authenticate BehaviorShield as a service in your own app.</div>

        <div className="pf-key-row">
          <code className="pf-key-value">
            {keyVisible ? profile.apiKey : profile.apiKey.replace(/.(?=.{4})/g, '•')}
          </code>
          <button className="pf-icon-btn" onClick={() => setKeyVisible((v) => !v)}>
            {keyVisible ? 'Hide' : 'Show'}
          </button>
          <button className="pf-icon-btn" onClick={copyKey}>{copyMsg || 'Copy'}</button>
        </div>
        <button className="pf-link-btn" onClick={handleRegenerateKey} disabled={regenBusy}>
          {regenBusy ? 'Regenerating…' : 'Regenerate key'}
        </button>

        <pre className="pf-code-snippet">{`fetch("https://api.behaviorshield.dev/v1/score", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${keyVisible ? profile.apiKey : 'bs_live_••••••••'}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ events, context })
})`}</pre>
      </motion.div>
    </div>
  )
}