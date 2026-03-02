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
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: ca })
      })
      const data = await res.json()
      if (data.success) {
        setSubmitMsg({ type: 'success', text: `✅ ${data.token.name} nominated! Get 50 votes to qualify.` })
        setCa('')
        fetchTokens()
      } else {
        setSubmitMsg({ type: 'error', text: data.error || 'Something went wrong' })
      }
    } catch (e) {
      setSubmitMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally { setSubmitting(false) }
  }

  const handleVote = async (tokenId) => {
    if (votedIds.has(tokenId)) return
    setVotingId(tokenId)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId })
      })
      const data = await res.json()
      if (data.success) {
        setVotedIds(v => new Set([...v, tokenId]))
        setVoteMsg(m => ({ ...m, [tokenId]: { type: 'success', text: data.qualified ? `🎉 Qualified! ${data.votes} votes` : `✅ Voted! ${data.votes}/${VOTES_TO_QUALIFY}` } }))
        fetchTokens()
      } else {
        setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: data.error } }))
      }
    } catch (e) {
      setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: 'Network error' } }))
    } finally { setVotingId(null) }
  }

  const pending = tokens.filter(t => t.status === 'pending')
  const queued = tokens.filter(t => t.status === 'queued')

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>
        <div style={{ marginBottom: 28 }}>
          <div className="section-label">◈ NOMINATION ARENA</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 3, marginBottom: 8 }}>NOMINATE A TOKEN</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
            Submit any Solana token contract address. Get <strong style={{ color: 'var(--accent)' }}>50 votes</strong> to qualify for the next race.
          </p>
        </div>

        {/* SUBMIT */}
        <div className="card fade-in-up" style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: 2, color: 'var(--text2)', marginBottom: 16 }}>SUBMIT CONTRACT ADDRESS</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <input className="input" style={{ flex: 1, minWidth: 260 }} placeholder="Solana contract address" value={ca} onChange={e => setCa(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !ca.trim()}>{submitting ? 'CHECKING...' : 'SUBMIT TOKEN'}</button>
          </div>
          {submitMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 4, fontSize: 12, background: submitMsg.type === 'success' ? 'rgba(0,245,160,0.08)' : 'rgba(255,61,107,0.08)', color: submitMsg.type === 'success' ? 'var(--accent)' : 'var(--danger)', border: `1px solid ${submitMsg.type === 'success' ? 'rgba(0,245,160,0.2)' : 'rgba(255,61,107,0.2)'}` }}>
              {submitMsg.text}
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            ◾ Token must be on Solana with a DexScreener listing · ◾ Free to nominate · ◾ 1 nomination per IP per hour
          </div>
        </div>

        {/* QUEUE */}
        {queued.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>✅ QUALIFIED — RACE QUEUE</div>
              <span className="badge badge-green">{queued.length} / 10 READY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {queued.map(token => (
                <div key={token.id} className="card" style={{ borderTop: '2px solid var(--accent)', background: 'linear-gradient(135deg, var(--surface), rgba(0,245,160,0.04))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {token.logo_url && <img src={token.logo_url} alt={token.name} style={{ width: 32, height: 32, borderRadius: '50%' }} onError={e => e.target.style.display='none'} />}
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--accent)', letterSpacing: 1 }}>{token.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>${token.ticker} · {formatMcap(token.current_mcap)}</div>
                    </div>
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>QUEUED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOTING */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>◈ VOTE TO QUALIFY — 50 VOTES NEEDED</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pending.length} tokens</div>
          </div>
          {loadingTokens && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', letterSpacing: 2 }}>LOADING...</div>}
          {!loadingTokens && pending.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No tokens nominated yet. Be the first!</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(token => {
              const pct = Math.min((token.votes / VOTES_TO_QUALIFY) * 100, 100)
              const voted = votedIds.has(token.id)
              const msg = voteMsg[token.id]
              return (
                <div key={token.id} className="card fade-in" style={{ borderLeft: `3px solid ${pct >= 80 ? 'var(--accent)' : 'var(--border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                      {token.logo_url
                        ? <img src={token.logo_url} alt={token.name} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border2)' }} onError={e => e.target.style.display='none'} />
                        : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text2)' }}>{token.ticker?.slice(0,2)}</div>
                      }
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{token.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>${token.ticker} · {formatMcap(token.current_mcap)} · {timeAgo(token.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>
                        <span>{token.votes} votes</span><span>{VOTES_TO_QUALIFY - token.votes} needed</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--warn)' : 'var(--border2)', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    <button className={`btn ${voted ? 'btn-outline' : 'btn-primary'}`} style={{ opacity: voted ? 0.5 : 1, fontSize: 10, padding: '8px 16px', flexShrink: 0 }} disabled={voted || votingId === token.id} onClick={() => handleVote(token.id)}>
                      {voted ? '✓ VOTED' : votingId === token.id ? 'VOTING...' : '▲ VOTE'}
                    </button>
                  </div>
                  {msg && <div style={{ marginTop: 8, fontSize: 11, padding: '6px 10px', borderRadius: 3, background: msg.type === 'success' ? 'rgba(0,245,160,0.08)' : 'rgba(255,61,107,0.08)', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)' }}>{msg.text}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
