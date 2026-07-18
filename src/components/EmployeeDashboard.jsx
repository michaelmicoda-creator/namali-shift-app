import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../App.jsx'
import { shiftService } from '../services/shiftService.js'
import { fmtClockTime, fmtClockDate, fmtDateIT, fmtTimeIT, getLocalDateStr, isSameRomeDay, isSameRomeMonth, durationMinutes, fmtDuration } from '../lib/dateUtils.js'

const ClockIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const LogoutIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
const CalendarIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
const HistoryIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
const UserIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const MapPinIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
const PhoneIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
const BriefcaseIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
const NfcIcon = ({ size=20, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1-.01 20"/></svg>

const avatarUrl = (name) => 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(name)

function EmployeeDashboard() {
  const { profile, logout } = useContext(AuthContext)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [activeShift, setActiveShift] = useState(null)
  const [activeTab, setActiveTab] = useState('clock')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { loadShifts() }, [])

  const loadShifts = async () => {
    try {
      const data = await shiftService.getMyShifts()
      setShifts(data || [])
      setActiveShift(data?.find(s => s.status === 'active') || null)
    } catch (e) { console.error(e) }
  }

  const handleClock = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await shiftService.clockEvent('NAMALI-001')
      setMessage(result?.message || 'Timbratura effettuata')
      await loadShifts()
    } catch (e) {
      setError(e.message || 'Errore durante la timbratura')
    } finally {
      setLoading(false)
      setTimeout(() => { setError(''); setMessage('') }, 4000)
    }
  }

  const todayIso = getLocalDateStr()
  const monthShifts = shifts.filter(s => isSameRomeMonth(s.clock_in, todayIso))
  const totalMinutes = monthShifts.reduce((acc, s) => {
    if (s.clock_in && s.clock_out) return acc + durationMinutes(s.clock_in, s.clock_out)
    if (s.status === 'active' && s.clock_in) return acc + durationMinutes(s.clock_in, null)
    return acc
  }, 0)

  const todayShift = shifts.find(s => isSameRomeDay(s.clock_in, todayIso))

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F5' }}>
      <header className="emp-header">
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={avatarUrl(profile?.full_name || '')} alt="" style={{ width: '48px', height: '48px', borderRadius: '16px', border: '3px solid rgba(255,255,255,0.3)', background: 'white' }} />
            <div>
              <h2 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Ciao, {profile?.full_name?.split(' ')[0]}</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>{profile?.position}</p>
            </div>
          </div>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}><LogoutIcon size={20} /></button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="emp-clock">{fmtClockTime(currentTime)}</div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{fmtClockDate(currentTime)}</p>
        </div>
      </header>

      <main className="emp-main">
        <div className="status-card">
          <div className="status-icon" style={{
            background: activeShift ? 'linear-gradient(135deg,#E8F5E9 0%,#C8E6C9 100%)' : 'linear-gradient(135deg,#FFF5F5 0%,#F5E6E6 100%)',
            border: `3px solid ${activeShift ? '#4CAF50' : '#D4A5A5'}`
          }}>
            <ClockIcon size={36} color={activeShift ? '#4CAF50' : '#D4A5A5'} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1A1A1A' }}>{activeShift ? 'Turno in corso' : 'Pronto per timbrare'}</h3>
          {activeShift && <p style={{ color: '#6B6B6B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Entrata: {fmtTimeIT(activeShift.clock_in)}</p>}
          {todayShift && !activeShift && <p style={{ color: '#6B6B6B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Uscita: {fmtTimeIT(todayShift.clock_out)}</p>}
          <button className={`clock-btn ${activeShift ? 'out' : 'in'}`} onClick={handleClock} disabled={loading}>
            {loading ? 'Timbratura...' : <><NfcIcon size={20} color="white" style={{ marginRight: '0.5rem' }} /> {activeShift ? 'Timbra Uscita' : 'Simula scansione NFC'}</>}
          </button>
          {error && <p style={{ color: '#C62828', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}
          {message && <p style={{ color: '#2E7D32', fontSize: '0.85rem', marginTop: '1rem' }}>{message}</p>}
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'clock' ? 'active' : ''}`} onClick={() => setActiveTab('clock')}><ClockIcon size={16} /> Timbratura</button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><HistoryIcon size={16} /> Storico</button>
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserIcon size={16} /> Profilo</button>
        </div>

        {activeTab === 'clock' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <CalendarIcon size={20} color="#D4A5A5" /><p style={{ fontSize: '0.8rem', color: '#6B6B6B', marginTop: '0.5rem' }}>Turni questo mese</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1A1A1A' }}>{monthShifts.length}</p>
              </div>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <ClockIcon size={20} color="#C9A96E" /><p style={{ fontSize: '0.8rem', color: '#6B6B6B', marginTop: '0.5rem' }}>Ore totali</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1A1A1A' }}>{fmtDuration(totalMinutes)}</p>
              </div>
            </div>
            {todayShift && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>Turno di oggi</p>
                <p style={{ fontSize: '1rem', fontWeight: 500, color: '#1A1A1A', marginTop: '0.25rem' }}>
                  Entrata: {fmtTimeIT(todayShift.clock_in)}
                  {todayShift.clock_out && ` — Uscita: ${fmtTimeIT(todayShift.clock_out)}`}
                </p>
                {todayShift.clock_out && <p style={{ fontSize: '0.85rem', color: '#6B6B6B', marginTop: '0.25rem' }}>Durata: {fmtDuration(durationMinutes(todayShift.clock_in, todayShift.clock_out))}</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Storico Turni</h3>
            {shifts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6B6B6B' }}>Nessun turno registrato</div>
            ) : shifts.map(s => (
              <div key={s.id} className="shift-row">
                <div>
                  <p style={{ fontWeight: 500, color: '#1A1A1A', marginBottom: '0.25rem' }}>{fmtDateIT(s.clock_in)}</p>
                  <p style={{ fontSize: '0.85rem', color: '#6B6B6B' }}>
                    {fmtTimeIT(s.clock_in)}
                    {s.clock_out && ` - ${fmtTimeIT(s.clock_out)}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${s.status === 'active' ? 'badge-online' : 'badge-offline'}`}>{s.status === 'active' ? 'In corso' : 'Completato'}</span>
                  {s.clock_out && <p style={{ fontSize: '0.85rem', color: '#6B6B6B', marginTop: '0.25rem' }}>{fmtDuration(durationMinutes(s.clock_in, s.clock_out))}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="fade-in">
            <div className="white-card">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <img src={avatarUrl(profile?.full_name || '')} alt="" style={{ width: '100px', height: '100px', borderRadius: '32px', marginBottom: '1rem', border: '4px solid #F5E6E6' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{profile?.full_name}</h3>
                <p style={{ color: '#6B6B6B', fontSize: '0.9rem' }}>{profile?.position}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#F8F4F4', borderRadius: '12px' }}><BriefcaseIcon size={18} color="#D4A5A5" /><div><p style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>Ruolo</p><p style={{ fontWeight: 500 }}>Dipendente</p></div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#F8F4F4', borderRadius: '12px' }}><PhoneIcon size={18} color="#D4A5A5" /><div><p style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>Email</p><p style={{ fontWeight: 500 }}>{profile?.email}</p></div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#F8F4F4', borderRadius: '12px' }}><MapPinIcon size={18} color="#D4A5A5" /><div><p style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>Azienda</p><p style={{ fontWeight: 500 }}>{profile?.companies?.name || 'Namalì'}</p></div></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default EmployeeDashboard
