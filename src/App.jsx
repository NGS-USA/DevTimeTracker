import { useState, useEffect, useRef } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function msToDisplay(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function msToPretty(ms) {
  if (!ms || ms < 60000) return ms ? `${Math.floor(ms / 1000)}s` : '0m'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── API Calls ──────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── PDF Export ─────────────────────────────────────────────────────────────

function buildPDF(title, exportSessions, breakdown) {
  const grand = exportSessions.reduce((a, s) => a + s.duration, 0)

  const rows = (sessions) => sessions.map(s => `
    <tr>
      <td>${new Date(s.startTime).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      <td>${fmtTime(s.startTime)}</td>
      <td>${fmtTime(s.endTime)}</td>
      <td><b>${msToPretty(s.duration)}</b></td>
      <td style="color:#666">${s.note || '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;background:#fff;padding:48px;font-size:13px;line-height:1.5}
    .hd{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px}
    .hd h1{font-size:20px;font-weight:700}
    .hd p{color:#777;font-size:11px;margin-top:3px}
    .sum{display:flex;gap:1px;background:#111;border-radius:6px;overflow:hidden;margin-bottom:28px}
    .sum-item{flex:1;background:#fff;padding:14px 18px}
    .sum-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;font-weight:600}
    .sum-value{font-size:20px;font-weight:700;margin-top:2px}
    .proj-hd{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:700;margin:24px 0 8px;padding-bottom:6px;border-bottom:1px solid #eee}
    .badge{background:#111;color:#fff;font-size:11px;padding:2px 10px;border-radius:999px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{background:#111;color:#fff;padding:7px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
    tbody td{padding:9px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}
    tbody tr:nth-child(even) td{background:#fafafa}
    @media print{body{padding:24px}@page{margin:.5in}}
  </style></head><body>
  <div class="hd">
    <h1>${title}</h1>
    <p>Exported ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
  </div>
  <div class="sum">
    <div class="sum-item"><div class="sum-label">Total Time</div><div class="sum-value">${msToPretty(grand)}</div></div>
    <div class="sum-item"><div class="sum-label">Sessions</div><div class="sum-value">${exportSessions.length}</div></div>
    ${breakdown ? `<div class="sum-item"><div class="sum-label">Projects</div><div class="sum-value">${breakdown.length}</div></div>` : ''}
  </div>
  ${breakdown
    ? breakdown.map(p => `
        <div class="proj-hd"><span>${p.name}</span><span class="badge">${msToPretty(p.total)}</span></div>
        <table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Notes</th></tr></thead>
        <tbody>${rows(p.sessions)}</tbody></table>
      `).join('')
    : `<table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Notes</th></tr></thead>
       <tbody>${rows(exportSessions)}</tbody></table>`
  }
  </body></html>`
}

function openPDFWindow(html) {
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow pop-ups to export PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const S = {
  wrap:       { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)' },
  topbar:     { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  logo:       { fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--accent)', fontWeight: 700, letterSpacing: '-.02em', marginRight: 6, whiteSpace: 'nowrap' },
  ghost:      { background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', padding: '9px 13px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 500, whiteSpace: 'nowrap' },
  exportBtn:  { background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '9px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600, whiteSpace: 'nowrap' },
  spacer:     { flex: 1 },
  main:       { maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px' },
  timerCard:  { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 32px 32px', marginBottom: 16, textAlign: 'center' },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 },
  statCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 16px' },
  statLabel:  { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 8 },
  statVal:    { fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-.02em' },
  secHd:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secTitle:   { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--muted)' },
  secCount:   { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' },
  sessCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 14 },
  sessDur:    { fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', minWidth: 58, paddingTop: 1 },
  sessDate:   { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', minWidth: 72, paddingTop: 3 },
  sessTime:   { fontSize: 12, color: 'var(--muted)', flex: 1, lineHeight: 1.6 },
  sessNote:   { marginTop: 3, fontSize: 11, color: 'var(--muted)' },
  xBtn:       { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', opacity: 0.6 },
  btnRow:     { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
  btnGreen:   { background: 'var(--accent)', color: '#071412', border: 'none', borderRadius: 10, padding: '12px 34px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' },
  btnGreenAlt:{ background: '#1ca87e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' },
  btnOutline: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' },
  btnDangerSm:{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' },
  noteLabel:  { display: 'block', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, textAlign: 'left', fontWeight: 600 },
  noteInput:  { width: '100%', borderRadius: 8 },
  crumb:      { fontSize: 11, color: 'var(--muted)', marginBottom: 14, letterSpacing: '.04em' },
  crumbBold:  { color: 'var(--text)' },
  hint:       { color: 'var(--muted)', fontSize: 13, marginBottom: 32, lineHeight: 1.8 },
  timerDisp:  (running, paused) => ({
    fontFamily: 'var(--mono)', fontSize: 72, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1,
    color: running ? 'var(--accent)' : paused ? '#a0aabf' : 'var(--text)',
    transition: 'color .3s', marginBottom: 8,
  }),
  timerStatus:{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 28 },
  modal:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 340 },
  modalTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  modalText:  { color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 },
  modalInput: { width: '100%', marginBottom: 16 },
  modalRow:   { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  toast:      { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#071412', padding: '10px 24px', borderRadius: 999, fontWeight: 700, fontSize: 13, zIndex: 200, whiteSpace: 'nowrap' },
  toastErr:   { background: 'var(--danger)', color: '#fff' },
  empty:      { color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '40px 0', lineHeight: 1.8 },
  loadingWrap:{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 12 },
  loadingText:{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent)', letterSpacing: '.08em' },
  loadingSub: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' },
  spinner:    { width: 28, height: 28, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  inlineLoad: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function App() {
  const [clients, setClients]             = useState([])
  const [projects, setProjects]           = useState([])
  const [sessions, setSessions]           = useState([])
  const [clientId, setClientId]           = useState('')
  const [projectId, setProjectId]         = useState('')
  const [running, setRunning]             = useState(false)
  const [elapsed, setElapsed]             = useState(0)
  const [startTs, setStartTs]             = useState(null)
  const [note, setNote]                   = useState('')
  const [modal, setModal]                 = useState(null)
  const [newName, setNewName]             = useState('')
  const [deleteId, setDeleteId]           = useState(null)
  const [toast, setToast]                 = useState(null)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState(null)
  const timerRef = useRef(null)

  // Add spin keyframe
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // Load clients on mount
  useEffect(() => {
    apiFetch('/api/clients')
      .then(data => { setClients(data); setError(null) })
      .catch(err => setError('Could not connect to database. Check your environment variables.'))
      .finally(() => setLoadingClients(false))
  }, [])

  // Load projects when client changes
  useEffect(() => {
    if (!clientId) { setProjects([]); return }
    setLoadingProjects(true)
    setProjectId('')
    setSessions([])
    apiFetch(`/api/projects?clientId=${clientId}`)
      .then(data => setProjects(data))
      .catch(() => showToast('Failed to load projects', true))
      .finally(() => setLoadingProjects(false))
  }, [clientId])

  // Load sessions when project changes
  useEffect(() => {
    if (!projectId) { setSessions([]); return }
    setLoadingSessions(true)
    apiFetch(`/api/sessions?projectId=${projectId}`)
      .then(data => setSessions(data))
      .catch(() => showToast('Failed to load sessions', true))
      .finally(() => setLoadingSessions(false))
  }, [projectId])

  // Timer tick
  useEffect(() => {
    if (running && startTs) {
      timerRef.current = setInterval(() => setElapsed(Date.now() - startTs), 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running, startTs])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2800)
      return () => clearTimeout(t)
    }
  }, [toast])

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentClient  = clients.find(c => c.id === clientId)
  const currentProject = projects.find(p => p.id === projectId)
  const totalTime      = sessions.reduce((a, s) => a + s.duration, 0)
  const longest        = sessions.reduce((max, s) => s.duration > max ? s.duration : max, 0)
  const hasProject     = !!projectId
  const isPaused       = !running && elapsed > 0

  // ── Actions ───────────────────────────────────────────────────────────────

  function changeClient(id) {
    setClientId(id)
    setProjectId('')
    setSessions([])
  }

  function startTimer() {
    if (!projectId || running) return
    setStartTs(Date.now())
    setRunning(true)
  }

  function stopTimer() { setRunning(false) }

  function resetTimer() {
    if (running) return
    setElapsed(0)
    setStartTs(null)
    setNote('')
  }

  async function submitSession() {
    if (!startTs || elapsed < 1000 || !projectId || submitting) return
    setSubmitting(true)
    try {
      const saved = await apiFetch('/api/sessions', {
        method: 'POST',
        body: {
          clientId,
          projectId,
          startTime: new Date(startTs).toISOString(),
          endTime:   new Date(startTs + elapsed).toISOString(),
          duration:  elapsed,
          note:      note.trim(),
        },
      })
      setSessions(prev => [saved, ...prev])
      setElapsed(0)
      setStartTs(null)
      setNote('')
      showToast('Session logged ✓')
    } catch {
      showToast('Failed to save session', true)
    } finally {
      setSubmitting(false)
    }
  }

  async function addClient() {
    if (!newName.trim()) return
    try {
      const client = await apiFetch('/api/clients', { method: 'POST', body: { name: newName.trim() } })
      setClients(prev => [...prev, client])
      setClientId(client.id)
      setProjectId('')
      setSessions([])
      setNewName('')
      setModal(null)
    } catch {
      showToast('Failed to add client', true)
    }
  }

  async function addProject() {
    if (!newName.trim() || !clientId) return
    try {
      const project = await apiFetch('/api/projects', { method: 'POST', body: { name: newName.trim(), clientId } })
      setProjects(prev => [...prev, project])
      setProjectId(project.id)
      setSessions([])
      setNewName('')
      setModal(null)
    } catch {
      showToast('Failed to add project', true)
    }
  }

  async function deleteSession(id) {
    try {
      await apiFetch(`/api/sessions?id=${id}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
      setDeleteId(null)
      setModal(null)
      showToast('Session deleted')
    } catch {
      showToast('Failed to delete session', true)
    }
  }

  function exportPDF(type) {
    if (!currentClient) return
    let exportSessions, title, breakdown

    if (type === 'project') {
      if (!currentProject) return
      exportSessions = sessions
      title = `${currentClient.name} — ${currentProject.name}`
      breakdown = null
    } else {
      const allClientSessions = [] // can't export all sessions without fetching per-project
      // For client export we use current sessions grouped by project
      const clientProjects = projects.filter(p => p.clientId === clientId)
      exportSessions = sessions
      title = `${currentClient.name} — All Projects`
      breakdown = clientProjects.map(p => ({
        name: p.name,
        sessions: sessions.filter(s => s.projectId === p.id),
        total: sessions.filter(s => s.projectId === p.id).reduce((a, s) => a + s.duration, 0),
      })).filter(p => p.sessions.length > 0)
      if (breakdown.length === 0) breakdown = null
    }

    openPDFWindow(buildPDF(title, exportSessions, breakdown))
  }

  // ── Loading Screen ────────────────────────────────────────────────────────

  if (loadingClients) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner} />
        <div style={S.loadingText}>DevTrack</div>
        <div style={S.loadingSub}>Connecting to database…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={S.loadingWrap}>
        <div style={{ ...S.loadingText, color: 'var(--danger)' }}>Connection Error</div>
        <div style={{ ...S.loadingSub, maxWidth: 340, textAlign: 'center', lineHeight: 1.7 }}>{error}</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>

      {/* ── Top Bar ── */}
      <div style={S.topbar}>
        <span style={S.logo}>⏱ DevTrack</span>

        <select style={{ minWidth: 170 }} value={clientId} onChange={e => changeClient(e.target.value)}>
          <option value="">Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          style={{ minWidth: 170 }}
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          disabled={!clientId || loadingProjects}
        >
          <option value="">{loadingProjects ? 'Loading…' : 'Select project…'}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <button style={S.ghost} onClick={() => { setNewName(''); setModal('client') }}>+ Client</button>
        {clientId && (
          <button style={S.ghost} onClick={() => { setNewName(''); setModal('project') }}>+ Project</button>
        )}

        <div style={S.spacer} />

        {clientId && (
          <button style={S.exportBtn} onClick={() => exportPDF('client')}>↓ Export Client</button>
        )}
        {projectId && (
          <button style={S.exportBtn} onClick={() => exportPDF('project')}>↓ Export Project</button>
        )}
      </div>

      {/* ── Main Content ── */}
      <div style={S.main}>

        {/* Timer Card */}
        <div style={S.timerCard}>
          {!hasProject ? (
            <div style={S.hint}>
              Select a client and project above to start tracking time.<br />
              Use <b style={{ color: 'var(--text)', fontWeight: 600 }}>+ Client</b> and <b style={{ color: 'var(--text)', fontWeight: 600 }}>+ Project</b> to add new ones.
            </div>
          ) : (
            <div style={S.crumb}>
              {currentClient?.name}&nbsp;/&nbsp;
              <span style={S.crumbBold}>{currentProject?.name}</span>
            </div>
          )}

          <div
            style={S.timerDisp(running, isPaused)}
            className={running ? 'timer-running' : ''}
          >
            {msToDisplay(elapsed)}
          </div>

          <div style={{ ...S.timerStatus, color: running ? 'var(--accent)' : 'var(--muted)' }}>
            {running
              ? <><span className="rec-dot" style={{ color: 'var(--danger)', marginRight: 6 }}>●</span>recording</>
              : isPaused ? '⏸ paused — ready to submit'
              : '○ ready'}
          </div>

          <div style={S.btnRow}>
            {!running && elapsed === 0 && (
              <button
                style={{ ...S.btnGreen, opacity: hasProject ? 1 : 0.4, cursor: hasProject ? 'pointer' : 'not-allowed' }}
                onClick={startTimer}
                disabled={!hasProject}
              >
                Start
              </button>
            )}
            {running && (
              <button style={S.btnOutline} onClick={stopTimer}>Stop</button>
            )}
            {isPaused && (
              <>
                <button style={S.btnGreen} onClick={startTimer}>Resume</button>
                <button
                  style={{ ...S.btnGreenAlt, opacity: submitting ? 0.6 : 1 }}
                  onClick={submitSession}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Log Session'}
                </button>
                <button style={S.btnOutline} onClick={resetTimer}>Reset</button>
              </>
            )}
          </div>

          {isPaused && (
            <div>
              <label style={S.noteLabel}>Session note (optional)</label>
              <input
                style={S.noteInput}
                placeholder="What did you work on?"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitSession()}
              />
            </div>
          )}
        </div>

        {/* Stats */}
        {hasProject && (
          <div style={S.statsGrid}>
            {[
              { label: 'Total Time',      val: msToPretty(totalTime) || '0m' },
              { label: 'Longest Session', val: msToPretty(longest) || '0m' },
              { label: 'Total Sessions',  val: String(sessions.length) },
            ].map(st => (
              <div key={st.label} style={S.statCard}>
                <div style={S.statLabel}>{st.label}</div>
                <div style={S.statVal}>{st.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {hasProject && (
          <>
            <div style={S.secHd}>
              <span style={S.secTitle}>Session Timeline</span>
              {sessions.length > 0 && (
                <span style={S.secCount}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loadingSessions ? (
              <div style={S.inlineLoad}>Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div style={S.empty}>
                No sessions logged yet.<br />
                Start the timer to record your first session.
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} style={S.sessCard} className="fade-in">
                  <div style={S.sessDate}>{fmtDate(s.startTime)}</div>
                  <div style={S.sessDur}>{msToPretty(s.duration)}</div>
                  <div style={S.sessTime}>
                    {fmtTime(s.startTime)} → {fmtTime(s.endTime)}
                    {s.note && <div style={S.sessNote}>{s.note}</div>}
                  </div>
                  <button
                    style={S.xBtn}
                    title="Delete session"
                    onClick={() => { setDeleteId(s.id); setModal('delete') }}
                  >×</button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === 'client' && (
        <div style={S.modal} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Add New Client</div>
            <input
              style={S.modalInput}
              placeholder="Client name"
              value={newName}
              autoFocus
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addClient()}
            />
            <div style={S.modalRow}>
              <button style={S.btnOutline} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btnGreen} onClick={addClient}>Add Client</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'project' && (
        <div style={S.modal} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Add Project to {currentClient?.name}</div>
            <input
              style={S.modalInput}
              placeholder="Project name"
              value={newName}
              autoFocus
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()}
            />
            <div style={S.modalRow}>
              <button style={S.btnOutline} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btnGreen} onClick={addProject}>Add Project</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'delete' && (
        <div style={S.modal} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Delete this session?</div>
            <p style={S.modalText}>
              This will permanently remove the logged time entry. This cannot be undone.
            </p>
            <div style={S.modalRow}>
              <button style={S.btnOutline} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btnDangerSm} onClick={() => deleteSession(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...S.toast, ...(toast.isError ? S.toastErr : {}) }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
