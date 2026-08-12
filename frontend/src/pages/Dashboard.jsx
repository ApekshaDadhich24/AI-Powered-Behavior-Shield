import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LiveMonitor from './LiveMonitor'
import SessionAnalytics from './SessionAnalytics'
import { BehaviorSocketProvider } from '../context/BehaviorSocketContext'
import './Dashboard.css'

const TABS = [
  { id: 'live', label: 'Live Monitor' },
  { id: 'analytics', label: 'Session Analytics' },
  { id: 'profile', label: 'Profile' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('live')

  return (
     <BehaviorSocketProvider>
    <div className="dash-page">
      <div className="dash-topbar">
        <div className="dash-brand"><span className="dash-brand-shield">🛡</span> BehaviorShield</div>
        <div className="dash-topbar-right">
          <span className="dash-username">{user?.username}</span>
          <button className="dash-signout" onClick={() => { logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      <div className="dash-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`dash-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="dash-content">
        {tab === 'live' && <LiveMonitor />}
        {tab === 'analytics' && <SessionAnalytics />}
        {tab === 'profile' && (
          <div className="dash-placeholder">
            <div className="dash-placeholder-icon">👤</div>
            <div className="dash-placeholder-title">Profile</div>
            <div className="dash-placeholder-sub">Coming next — account details, re-enrollment, session preferences.</div>
          </div>
        )}
      </div>
  </div>
  </BehaviorSocketProvider>
  )
}