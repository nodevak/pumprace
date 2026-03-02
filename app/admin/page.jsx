'use client'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { formatMcap, timeAgo } from '../../lib/format'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [ca, setCa] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const loadData = async (pwd) => {
    try {
      const res = await fetch(`/api/admin?password=${encodeURIComponent(pwd)}`)
      if (res.status === 401) { setAuthError('Wrong password'); return false }
      const d = await res.json()
      setData(d)
      return true
    } catch (e) {
      return false
    }
  }

  const handleAuth = async () => {
    setAuthError('')
    const ok = await loadData(password)
    if (ok) setAuthed(true)
    else setAuthError('Wrong password or server error')
  }

  const doAction = async (action, extra = {}) => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action, ...extra })
      })
      const d = await res.json()
      if (d.success) {
        setMsg({ type: 'success', text: d.message || 'Done!' })
        loadData(password)
      } else {
        setMsg({ type: 'error', text: d.error })
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <>
        <Navbar />
        <div className="page-wrap" style={{ paddingTop: 60, maxWidth: 400 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 3, marginBottom: 20, color: 'var(--accent)' }}>
              🔐 ADMIN ACCESS
            </div>
            <input
              className="input"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAuth}>
              ENTER
            </button>
            {authError && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)' }}>{authError}</div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, letterSpacing: 3 }}>⚙️ ADMIN PANEL</h1>
          <button className="btn btn-outline" style={{ fontSize: 10 }} onClick={() => loadData(password)}>
            ↻ REFRESH
          </button>
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 4, marginBottom: 20, fontSize: 12,
            background: msg.type === 'success' ? 'rgba(0,245,160,0.08)' : 'rgba(255,61,107,0.08)',
            color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(0,245,160,0.2)' : 'rgba(255,61,107,0.2)'}`
          }}>
            {msg.text}
          </div>
        )}

        {/* CURRENT RACE STATUS */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>◈ RACE STATUS</div>
          {data?.races?.length > 0 ? (
            <div>
              {data.races.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12 }}>Race #{r.id}</span>
                  <span className={`badge ${r.status === 'live' ? 'badge-green' : r.status === 'ended' ? 'badge-red' : 'badge-yellow'}`}>
                    {r.status.toUpperCase()}
                  </span>
                  {r.started_at && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Started: {new Date(r.started_at).toLocaleString()}</span>}
                  {r.ended_at && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Ended: {new Date(r.ended_at).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No races yet.</div>
          )}
        </div>

        {/* STEP 1: INIT RACE */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>STEP 1 — INITIALIZE FIRST RACE</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
            Creates a new "waiting" race slot. Do this once before adding tokens.
            Skip if a race already exists.
          </div>
          <button className="btn btn-outline" disabled={loading} onClick={() => doAction('init-race')}>
            CREATE RACE SLOT
          </button>
        </div>

        {/* STEP 2: ADD TOKENS */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>STEP 2 — ADD TOKENS MANUALLY</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
            Add tokens directly to the race queue bypassing the vote requirement.
            Add 10 tokens, then start the race in Step 3.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 260 }}
              placeholder="Solana contract address"
              value={ca}
              onChange={e => setCa(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={loading || !ca.trim()}
              onClick={() => { doAction('add-token', { contractAddress: ca }); setCa('') }}
            >
              ADD TOKEN
            </button>
          </div>

          {/* Queued tokens list */}
          {data?.queuedTokens?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                QUEUED ({data.queuedTokens.length}/10):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.queuedTokens.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                    background: 'var(--surface2)', borderRadius: 4, fontSize: 12
                  }}>
                    <span className="badge badge-green">QUEUED</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 11 }}>{t.name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 10 }}>${t.ticker} · {formatMcap(t.current_mcap)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: START RACE */}
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(0,245,160,0.2)' }}>
          <div className="section-label" style={{ marginBottom: 8, color: 'var(--accent)' }}>
            STEP 3 — START THE RACE
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
            Starts the race with all currently queued tokens. Needs at least 4 tokens (10 recommended).
            This kicks off the 4-hour countdown.
          </div>
          <button
            className="btn btn-primary"
            disabled={loading || (data?.queuedTokens?.length || 0) < 4}
            onClick={() => doAction('start-race')}
          >
            🏁 START RACE ({data?.queuedTokens?.length || 0} tokens ready)
          </button>
        </div>

        {/* PENDING TOKENS */}
        {data?.pendingTokens?.length > 0 && (
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>◈ COMMUNITY NOMINATIONS ({data.pendingTokens.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.pendingTokens.slice(0, 20).map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text)' }}>{t.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>${t.ticker}</span>
                  <span className="badge badge-blue">{t.votes} votes</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>{formatMcap(t.current_mcap)}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 'auto' }}>{timeAgo(t.created_at)}</span>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 9, padding: '4px 8px' }}
                    onClick={() => doAction('add-token', { contractAddress: t.contract_address })}
                  >
                    ADD TO QUEUE
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
