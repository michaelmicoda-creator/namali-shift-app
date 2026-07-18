import React, { useState, useContext } from 'react'
import { AuthContext } from '../App.jsx'

const Sparkles = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
const EyeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

function Login({ deactivationError }) {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, role)
    } catch (err) {
      setError(err.message || 'Email o password non validi')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type) => {
    setRole(type)
    if (DEMO_MODE) {
      setEmail(type === 'employee' ? 'maria@namali.it' : 'admin@namali.it')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'linear-gradient(135deg,#C9A96E 0%,#E8D5A3 100%)', borderRadius: '50%', opacity: 0.15 }}></div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="login-logo"><Sparkles /></div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.75rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>Namalì</h1>
          <p style={{ color: '#6B6B6B', fontSize: '0.9rem', fontWeight: 300 }}>Istituto di Bellezza</p>
        </div>
        <div className="role-toggle">
          <button type="button" className={`role-btn ${role === 'employee' ? 'active' : ''}`} onClick={() => setRole('employee')}><UserIcon /> Dipendente</button>
          <button type="button" className={`role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}><ShieldIcon /> Admin</button>
        </div>
        <form onSubmit={handleSubmit}>
          {deactivationError && <div className="error-box">{deactivationError}</div>}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#2D2D2D' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@namali.it" className="input" required />
          </div>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#2D2D2D' }}>Password</label>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" required style={{ paddingRight: '3rem' }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '1rem', top: '2.3rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
        {DEMO_MODE && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #F5E6E6', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#6B6B6B', marginBottom: '0.75rem' }}>Credenziali demo:</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => fillDemo('employee')}>Dipendente</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => fillDemo('admin')}>Admin</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
