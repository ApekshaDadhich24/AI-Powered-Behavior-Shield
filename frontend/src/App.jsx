import { Routes, Route, Navigate } from 'react-router-dom'
import CustomCursor from './components/CustomCursor'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EnrollPage from './pages/EnrollPage'
import Dashboard from './pages/Dashboard'
import { useAuth } from './context/AuthContext'

function App() {
  const { user } = useAuth()

  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/enroll" element={
          user ? <EnrollPage /> : <Navigate to="/login" />
        } />
        <Route path="/dashboard" element={
          user ? <Dashboard /> : <Navigate to="/login" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default App