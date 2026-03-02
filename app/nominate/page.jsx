'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { formatMcap, timeAgo } from '../../lib/format'

const VOTES_TO_QUALIFY = 50

export default function NominatePage() {
  const [ca, setCa] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const [tokens, setTokens] = useState([])
  const [loadingTokens, setLoadingTokens] = useState(true)
  const [votingId, setVotingId] = useState(null)
  const [voteMsg, setVoteMsg] = useState({})
  const [votedIds, setVotedIds] = useState(new Set())

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/nominate')
      const data = await res.json()
      setTokens(data.tokens || [])
    } catch (e) { console.error(e) }
    finally { setLoadingTokens(false) }
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  const handleSubmit = async () => {
    if (!ca.trim()) return
    setSubmitting(true); setSubmitMsg(null)
    try {
      const res = await fetch('/api/nominate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: ca })
      })
      const data = await res.json()
      if (data.success) {
        setSubmitMsg({ type: 'success', text: `✓ ${data.token.name} nominated! Get 50 votes to qualify.` })
        setCa(''); fetchTokens()
      } else { setSubmitMsg({ type: 'error', text: data.error || 'Something went wrong' }) }
    } catch (e) { setSubmitMsg({ type: 'error', text: 'Network error. Try again.' }) }
    finally { setSubmitting(false) }
  }

  const handleVote = async (tokenId) => {
    if (votedIds.has(tokenId)) return
    setVotingId(tokenId)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId })
      })
      const data = await res.json()
      if (data.success) {
        setVotedIds(v => new Set([...v, tokenId]))
        setVoteMsg(m => ({ ...m, [tokenId]: { type: 'success', text: data.qualified ? `🎉 Qualified! ${data.votes} votes` : `✓ Voted! ${data.votes}/${VOTES_TO_QUALIFY}` } }))
        fetchTokens()
      } else { setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: data.error } })) }
    } catch (e) { setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: 'Network error' } })) }
    finally { setVotingId(null) }
  }

  const pending = tokens.filter(t => t.status === 'pending')
  const queued = tokens.filter(t => t.status === 'queued')

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 48 }}>

        {/* HEADER */}
        <div className="fade-in-up" style={{ marginBottom: 40 }}>
          <div className="section-label">◈ NOMINATION ARENA</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 6vw, 52px)', letterSpacing: 5, marginBottom: 12, lineHeight: 1 }}>NOMINATE A TOKEN</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.9, maxWidth: 520 }}>
            Submit any Solana token. Get <strong style={{ color: 'var(--gold)' }}>50 community votes</strong> to qualify for the next race. Free, no wallet needed.
          </p>
        </div>

        {/* SUBMIT FORM */}
        <div className="card fade-in-up" style={{ marginBottom: 40, animationDelay: '0.1s' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 3, color: 'var(--text2)', marginBottom: 20 }}>SUBMIT CONTRACT ADDRESS</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: submitMsg ? 16 : 0 }}>
            <input className="input" style={{ flex: 1, minWidth: 280 }} placeholder="Solana contract address (e.g. 7xKX...pump)" value={ca} onChange={e => setCa(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !ca.trim()} style={{ flexShrink: 0 }}>
              {submitting ? 'CHECKING...' : 'SUBMIT TOKEN'}
            </button>
          </div>
          {submitMsg && (
            <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 12, letterSpacing: 0.5, background: submitMsg.type === 'success' ? 'rgba(0,229,204,0.06)' : 'rgba(230,57,80,0.06)', color: submitMsg.type === 'success' ? 'var(--teal)' : '#e63950', border: `1px solid ${submitMsg.type === 'success' ? 'rgba(0,229,204,0.15)' : 'rgba(230,57,80,0.15)'}` }}>
              {submitMsg.text}
            </div>
          )}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['Token must have a DexScreener listing', 'Free to nominate — no fees', '1 nomination per IP per hour'].map(t => (
              <div key={t} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--gold)', fontSize: 8 }}>◆</span> {t}
              </div>
            ))}
          </div>
        </div>

        {/* QUEUED */}
        {queued.length > 0 && (
          <div style={{ marginBottom: 40 }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3 }}>RACE QUEUE</div>
              <span className="badge badge-green">{queued.length} / 10 READY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {queued.map(token => (
                <div key={token.id} style={{ background: 'linear-gradient(135deg, rgba(0,229,204,0.05), rgba(12,10,24,0.9))', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {token.logo_url && <img src={token.logo_url} alt={token.name} style={{ width: 36, height: 36, borderRadius: '50%' }} onError={e => e.target.style.display='none'} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 1, color: 'var(--teal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{token.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>${token.ticker} · {formatMcap(token.current_mcap)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOTING */}
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <div className="section-label">◈ VOTING ARENA</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3 }}>VOTE TO QUALIFY</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pending.length} TOKENS COMPETING</div>
          </div>

          {loadingTokens && <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', letterSpacing: 4, fontFamily: 'var(--font-display)', fontSize: 16 }}>LOADING...</div>}
          {!loadingTokens && pending.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--muted)' }}>NO TOKENS YET — BE FIRST</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((token, i) => {
              const pct = Math.min((token.votes / VOTES_TO_QUALIFY) * 100, 100)
              const voted = votedIds.has(token.id)
              const msg = voteMsg[token.id]
              const barColor = pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--gold)' : 'var(--border2)'

              return (
                <div key={token.id} className="rank-row fade-in-up" style={{ animationDelay: `${i * 0.04}s`, borderLeft: `3px solid ${barColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    {token.logo_url
                      ? <img src={token.logo_url} alt={token.name} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border2)', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text2)', flexShrink: 0 }}>{token.ticker?.slice(0,2)}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 1.5, marginBottom: 6 }}>{token.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>${token.ticker} · {formatMcap(token.current_mcap)} · {timeAgo(token.created_at)}</span>
                        <div style={{ flex: 1, minWidth: 100, maxWidth: 200 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginBottom: 4 }}>
                            <span>{token.votes} votes</span><span>{VOTES_TO_QUALIFY - token.votes} left</span>
                          </div>
                          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: barColor, transition: 'width 0.6s ease', boxShadow: pct >= 80 ? `0 0 8px ${barColor}` : 'none' }} />
                          </div>
                        </div>
                      </div>
                      {msg && <div style={{ marginTop: 6, fontSize: 11, color: msg.type === 'success' ? 'var(--teal)' : '#e63950' }}>{msg.text}</div>}
                    </div>
                  </div>
                  <button className={`btn ${voted ? 'btn-outline' : 'btn-primary'}`} style={{ opacity: voted ? 0.5 : 1, fontSize: 10, padding: '9px 20px', flexShrink: 0 }} disabled={voted || votingId === token.id} onClick={() => handleVote(token.id)}>
                    {voted ? '✓ VOTED' : votingId === token.id ? '...' : '▲ VOTE'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
