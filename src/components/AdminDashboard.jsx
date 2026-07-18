import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../App.jsx'
import { shiftService } from '../services/shiftService.js'
import { reportService } from '../services/reportService.js'
import { supabase } from '../lib/supabase.js'
import { fmtDateIT, fmtTimeIT, fmtDateTimeIT, getMonthName, durationMinutes, fmtDuration, getCurrentMonthYear, getLocalDateStr, getDateRangeFilter, isSameRomeDay } from '../lib/dateUtils.js'

const LayoutIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
const UsersIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
const CalendarIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
const TrendingIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const SettingsIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
const LogoutIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
const BellIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
const ClockIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const CheckIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
const AlertIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
const DownloadIcon = ({s=20,c='currentColor'})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>

const avatarUrl = (name) => 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(name)

function AdminDashboard() {
  const { profile, logout } = useContext(AuthContext)
  const [section, setSection] = useState('dashboard')
  const [showNotif, setShowNotif] = useState(false)
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ employeeId: '', startDate: '', endDate: '', status: '' })
  const [reportYear, setReportYear] = useState(getCurrentMonthYear().year)
  const [reportMonth, setReportMonth] = useState(getCurrentMonthYear().month)
  const [reportData, setReportData] = useState(null)
  const [notifError, setNotifError] = useState('')

  useEffect(() => { loadData() }, [section])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: emps } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('company_id', profile?.company_id)
      setEmployees(emps || [])
      const sh = await shiftService.getCompanyShifts()
      setShifts(sh || [])
      const ev = await shiftService.getClockEvents()
      setEvents(ev || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const activeShifts = shifts.filter(s => s.status === 'active')
  const todayIso = getLocalDateStr()
  const todayShifts = shifts.filter(s => isSameRomeDay(s.clock_in, todayIso))
  const unreadCount = events.filter(e => !e.read).length

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutIcon },
    { id: 'employees', label: 'Dipendenti', icon: UsersIcon },
    { id: 'shifts', label: 'Turni', icon: CalendarIcon },
    { id: 'reports', label: 'Report Mensile', icon: TrendingIcon },
    { id: 'settings', label: 'Impostazioni', icon: SettingsIcon }
  ]

  const exportCSV = () => {
    reportService.exportCSV(filteredShifts, 'turni_' + todayIso + '.csv')
  }

  const generateReport = async () => {
    try {
      const data = await shiftService.getMonthlyReport(reportYear, reportMonth)
      setReportData(data || [])
    } catch (e) { console.error(e) }
  }

  const readEvent = async (id) => {
    setNotifError('')
    try {
      const { error } = await supabase.from('clock_events').update({ read: true }).eq('id', id)
      if (error) {
        setNotifError('Errore: ' + error.message)
        return
      }
      loadData()
    } catch (e) {
      setNotifError('Errore di rete')
    }
  }

  const filteredShifts = shifts.filter(s => {
    if (filters.employeeId && s.employee_id !== filters.employeeId) return false
    const range = getDateRangeFilter(filters.startDate, filters.endDate)
    if (range.start && new Date(s.clock_in).getTime() < new Date(range.start).getTime()) return false
    if (range.end && new Date(s.clock_in).getTime() >= new Date(range.end).getTime()) return false
    if (filters.status && s.status !== filters.status) return false
    return true
  })

  return (
    <div className="admin-wrap">
      <aside className="sidebar">
        <div className="sidebar-brand"><h2>Namalì</h2><p>Pannello Admin</p></div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button key={item.id} className={`sidebar-btn ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setShowNotif(false) }}>
              <item.icon s={18} /> {item.label}
            </button>
          ))}
        </nav>
        <button className="sidebar-btn" onClick={logout} style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
          <LogoutIcon s={18} /> Esci
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <h1 style={{ fontSize: '1.25rem', color: '#1A1A1A' }}>{sidebarItems.find(s => s.id === section)?.label}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.5rem' }}>
                <BellIcon s={22} c="#2D2D2D" />
                {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: '#FF5252', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{unreadCount}</span>}
              </button>
              {showNotif && (
                <div className="notif-dropdown">
                  <div style={{ padding: '1rem', borderBottom: '1px solid #F5E6E6' }}>
                    <h4 style={{ fontSize: '0.9rem' }}>Notifiche</h4>
                    {notifError && <p style={{ color: '#C62828', fontSize: '0.8rem', marginTop: '0.25rem' }}>{notifError}</p>}
                  </div>
                  {events.length === 0 ? <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6B6B6B' }}>Nessuna notifica</div> :
                    events.slice(0, 8).map(ev => (
                      <div key={ev.id} className={`notif-item ${!ev.read ? 'unread' : ''}`} onClick={() => readEvent(ev.id)}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                          <div className="notif-dot" style={{ background: ev.read ? '#C0C0C0' : '#D4A5A5' }}></div>
                          <div>
                            <p style={{ fontSize: '0.85rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>{ev.profiles?.full_name || 'Utente'} — {ev.event_type === 'clock_in' ? 'Entrata' : ev.event_type === 'clock_out' ? 'Uscita' : 'Rifiutato'}</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>{fmtDateTimeIT(ev.occurred_at)} — {ev.result}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <img src={avatarUrl(profile?.full_name || '')} alt="" style={{ width: '36px', height: '36px', borderRadius: '12px', border: '2px solid #F5E6E6' }} />
          </div>
        </header>

        <div style={{ padding: '1.5rem' }}>
          {loading && section !== 'settings' ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B6B6B' }}>Caricamento...</div>
          ) : (
            <>
              {section === 'dashboard' && (
                <div className="fade-in">
                  <div className="stats-grid">
                    <div className="stat-card gradient">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}><UsersIcon s={24} c="white" /><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Online</span></div>
                      <p className="stat-value">{activeShifts.length}</p><p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Dipendenti in turno</p>
                    </div>
                    <div className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}><CalendarIcon s={24} c="#D4A5A5" /><span style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>Oggi</span></div>
                      <p className="stat-value" style={{ color: '#1A1A1A' }}>{todayShifts.length}</p><p style={{ fontSize: '0.85rem', color: '#6B6B6B' }}>Turni registrati</p>
                    </div>
                    <div className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}><ClockIcon s={24} c="#C9A96E" /><span style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>Totale</span></div>
                      <p className="stat-value" style={{ color: '#1A1A1A' }}>{shifts.length}</p><p style={{ fontSize: '0.85rem', color: '#6B6B6B' }}>Turni nel sistema</p>
                    </div>
                  </div>

                  <h3 className="section-title">Dipendenti Online</h3>
                  <div className="white-card">
                    {activeShifts.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#6B6B6B' }}><AlertIcon s={32} c="#ccc" /><p>Nessun dipendente in turno</p></div> :
                      activeShifts.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #F5E6E6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4CAF50' }}></div>
                            <div><p style={{ fontWeight: 500 }}>{s.profiles?.full_name}</p><p style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>Entrata: {fmtTimeIT(s.clock_in)}</p></div>
                          </div>
                          <span className="badge badge-online">In turno</span>
                        </div>
                      ))}
                  </div>

                  <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Attività Recente</h3>
                  <div className="white-card">
                    {events.slice(0, 5).map((ev, i) => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < 4 ? '1px solid #F5E6E6' : 'none' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ev.event_type === 'clock_in' ? '#E8F5E9' : ev.event_type === 'clock_out' ? '#FFEBEE' : '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {ev.event_type === 'clock_in' ? <CheckIcon s={16} c="#4CAF50" /> : ev.event_type === 'clock_out' ? <ClockIcon s={16} c="#FF5252" /> : <AlertIcon s={16} c="#FF9800" />}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.9rem', color: '#1A1A1A' }}>{ev.profiles?.full_name || 'Utente'} — {ev.event_type === 'clock_in' ? 'Entrata' : ev.event_type === 'clock_out' ? 'Uscita' : 'Rifiutato'} ({ev.result})</p>
                          <p style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>{fmtDateTimeIT(ev.occurred_at)} — {ev.stations?.name || ev.stations?.code || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'employees' && (
                <div className="fade-in white-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Team Namalì</h3>
                  {employees.map(emp => {
                    const isActive = activeShifts.some(s => s.employee_id === emp.id)
                    const empShifts = shifts.filter(s => s.employee_id === emp.id && s.status === 'completed')
                    const totalMin = empShifts.reduce((acc, s) => {
                      if (s.clock_in && s.clock_out) return acc + durationMinutes(s.clock_in, s.clock_out)
                      return acc
                    }, 0)
                    return (
                      <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #F5E6E6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <img src={avatarUrl(emp.full_name)} alt="" style={{ width: '48px', height: '48px', borderRadius: '16px', border: '2px solid #F5E6E6' }} />
                          <div><p style={{ fontWeight: 500 }}>{emp.full_name}</p><p style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>{emp.position}</p></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${isActive ? 'badge-online' : 'badge-offline'}`}>{isActive ? 'Online' : 'Offline'}</span>
                          <p style={{ fontSize: '0.8rem', color: '#6B6B6B', marginTop: '0.25rem' }}>{fmtDuration(totalMin)} totali</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {section === 'shifts' && (
                <div className="fade-in">
                  <div className="white-card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Filtri</h3>
                    <div className="filter-grid">
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Dipendente</label>
                        <select className="input" value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })}>
                          <option value="">Tutti</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Data Inizio</label><input type="date" className="input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} /></div>
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Data Fine</label><input type="date" className="input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} /></div>
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Stato</label>
                        <select className="input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                          <option value="">Tutti</option><option value="active">In corso</option><option value="completed">Completati</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={exportCSV}><DownloadIcon s={16} /> Esporta CSV</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setFilters({ employeeId: '', startDate: '', endDate: '', status: '' })}>Reset</button>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Data</th><th>Dipendente</th><th>Entrata</th><th>Uscita</th><th>Durata</th><th>Stato</th><th>Postazione</th></tr></thead>
                      <tbody>
                        {filteredShifts.map(s => (
                          <tr key={s.id}>
                            <td>{fmtDateIT(s.clock_in)}</td>
                            <td>{s.profiles?.full_name}</td>
                            <td>{fmtTimeIT(s.clock_in)}</td>
                            <td>{fmtTimeIT(s.clock_out)}</td>
                            <td>{s.clock_out ? fmtDuration(durationMinutes(s.clock_in, s.clock_out)) : '-'}</td>
                            <td><span className={`badge ${s.status === 'active' ? 'badge-online' : 'badge-offline'}`}>{s.status === 'active' ? 'In corso' : 'Completato'}</span></td>
                            <td>{s.clock_in_station?.code || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredShifts.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#6B6B6B' }}>Nessun turno trovato</div>}
                  </div>
                </div>
              )}

              {section === 'reports' && (
                <div className="fade-in">
                  <div className="white-card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Genera Report Mensile</h3>
                    <div className="filter-grid">
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Anno</label>
                        <select className="input" value={reportYear} onChange={e => setReportYear(parseInt(e.target.value))}>
                          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div><label style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '0.5rem', display: 'block' }}>Mese</label>
                        <select className="input" value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-gold" style={{ marginTop: '1rem' }} onClick={generateReport}><TrendingIcon s={16} /> Genera Report</button>
                  </div>
                  {reportData && (
                    <div className="fade-in">
                      <div className="white-card">
                        <h3 style={{ marginBottom: '1rem' }}>Report {String(reportMonth).padStart(2, '0')}/{reportYear}</h3>
                        <table>
                          <thead><tr><th>Dipendente</th><th>Turni</th><th>Ore Totali</th><th>Dettaglio</th></tr></thead>
                          <tbody>
                            {employees.map(emp => {
                              const empShifts = reportData.filter(s => s.employee_id === emp.id)
                              const totalMin = empShifts.reduce((acc, s) => {
                                if (s.clock_in && s.clock_out) return acc + durationMinutes(s.clock_in, s.clock_out)
                                return acc
                              }, 0)
                              return (
                                <tr key={emp.id}>
                                  <td>{emp.full_name}</td>
                                  <td>{empShifts.length}</td>
                                  <td>{fmtDuration(totalMin)}</td>
                                  <td>{empShifts.map(s => `${fmtDateIT(s.clock_in)}: ${fmtDuration(durationMinutes(s.clock_in, s.clock_out))}`).join(', ')}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => reportService.exportCSV(reportData, `report_${reportYear}_${String(reportMonth).padStart(2, '0')}.csv`)}><DownloadIcon s={16} /> Esporta CSV</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {section === 'settings' && (
                <div className="fade-in white-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Impostazioni</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F8F4F4', borderRadius: '12px' }}>
                      <div><p style={{ fontWeight: 500 }}>Notifiche Push</p><p style={{ fontSize: '0.8rem', color: '#6B6B6B' }}>Ricevi avvisi su timbrature (Fase 2)</p></div>
                      <button className="btn btn-sm" style={{ background: 'var(--namali-rose)', color: 'white' }} onClick={() => alert('Funzionalità in fase 2')}>Attiva</button>
                    </div>
                    <div style={{ padding: '1rem', background: '#F8F4F4', borderRadius: '12px' }}>
                      <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Info Centro</p>
                      <p style={{ fontSize: '0.85rem', color: '#6B6B6B' }}>Istituto di Bellezza Namalì<br/>Via Roma 123, Milano<br/>P.IVA 12345678901</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
