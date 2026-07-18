import React, { useState, useEffect, createContext } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { authService } from './services/authService.js'
import Login from './components/Login.jsx'
import EmployeeDashboard from './components/EmployeeDashboard.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'

export const AuthContext = createContext(null)

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deactivationError, setDeactivationError] = useState('')
  const navigate = useNavigate()

  const clearSession = async (message = '') => {
    try {
      await authService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    setUser(null)
    setProfile(null)
    setDeactivationError(message)
  }

  const validateProfile = async currentProfile => {
    if (!currentProfile) {
      await clearSession("Profilo non trovato. Contatta l'amministratore.")
      return false
    }
    if (currentProfile.active !== true) {
      await clearSession("Account disattivato. Contatta l'amministratore.")
      return false
    }
    setDeactivationError('')
    return true
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const session = await authService.getSession()
        if (session && mounted) {
          const currentProfile = await authService.getProfile()
          if (await validateProfile(currentProfile)) {
            setProfile(currentProfile)
            setUser(session.user)
          }
        }
      } catch (error) {
        console.error('Init error:', error)
        await clearSession('Sessione non valida. Accedi di nuovo.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: listener } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        navigate('/login')
        return
      }

      if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
        setTimeout(async () => {
          try {
            const currentProfile = await authService.getProfile()
            if (await validateProfile(currentProfile)) {
              setProfile(currentProfile)
              setUser(session.user)
            }
          } catch (error) {
            console.error('Session validation error:', error)
            await clearSession('Sessione non valida. Accedi di nuovo.')
          }
        }, 0)
      }
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [navigate])

  const login = async (email, password, expectedRole) => {
    const authData = await authService.signIn(email, password)
    const currentProfile = await authService.getProfile()

    if (!await validateProfile(currentProfile)) {
      throw new Error(currentProfile ? "Account disattivato. Contatta l'amministratore." : "Profilo non trovato. Contatta l'amministratore.")
    }

    if (currentProfile.role !== expectedRole) {
      await clearSession('')
      throw new Error('Credenziali non valide per il ruolo selezionato')
    }

    setProfile(currentProfile)
    setUser(authData.user)
    navigate(currentProfile.role === 'admin' ? '/admin' : '/dashboard')
    return currentProfile
  }

  const logout = async () => {
    await clearSession('')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF5F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="login-logo" style={{ marginBottom: '1rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <p style={{ color: '#6B6B6B' }}>Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, isAuthenticated: !!user, isAdmin: profile?.role === 'admin' }}>
      {deactivationError && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#FFEBEE', color: '#C62828', padding: '1rem', textAlign: 'center', zIndex: 9999, fontWeight: 500 }}>
          {deactivationError}
        </div>
      )}
      <Routes>
        <Route path="/login" element={user ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login deactivationError={deactivationError} />} />
        <Route path="/dashboard" element={user && profile?.role === 'employee' ? <EmployeeDashboard /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user && profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
