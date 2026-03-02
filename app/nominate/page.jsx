'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { formatMcap, timeAgo } from '@/lib/format'

const VOTES_TO_QUALIFY = 50
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function NominatePage() {
  const [ca, setCa] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const [tokens, setTokens] = useState([])
  const [loadingTokens, setLoadingTokens] = useState(true)
  const [votingId, setVotingId] = useState(null)
  const [voteMsg, setVoteMsg] = useState({})
  const [votedIds, setVotedIds] = useState(new Set())
  const nominateTurnstileRef = useRef(null)
  const voteTurnstileRefs = useRef({})
  const nominateTurnstileToken = useRef(null)
  const voteTurnstileTokens = useRef({})

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/nominate')
      const data = await res.json()
      setTokens(data.tokens || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTokens(false)
    }
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  // Load Turnstile script
  useEffect(() => {
    if (document.getElementById('cf-turnstile-script')) return
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  // Render nominate Turnstile widget
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !nominateTurnstileRef.current) return
    const checkAndRender = () => {
      if (window.turnstile) {
        window.turnstile.render(nominateTurnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => { nominateTurnstileToken.current = token },
          'expired-callback': () => { nominateTurnstileToken.current = null }
        })
      } else {
        setTimeout(checkAndRender, 500)
      }
    }
    checkAndRender()
  }, [])

  const handleSubmit = async () => {
    if (!ca.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)

    try {
      const res = await fetch('/api/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: ca, turnstileToken: nominateTurnstileToken.current || 'dev' })
      })
      const data = await res.json()

      if (data.success) {
        setSubmitMsg({ type: 'success', text: `✅ ${data.token.name} nominated! Now get 50 votes to qualify for the race.` })
        setCa('')
        fetchTokens()
      } else {
        setSubmitMsg({ type: 'error', text: data.error || 'Something went wrong' })
      }
    } catch (e) {
      setSubmitMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setSubmitting(false)
      if (window.turnstile && nominateTurnstileRef.current) {
        window.turnstile.reset(nominateTurnstileRef.current)
        nominateTurnstileToken.current = null
      }
    }
  }

  const handleVote = async (tokenId) => {
    if (votedIds.has(tokenId)) return
    setVotingId(tokenId)
    setVoteMsg(m => ({ ...m, [tokenId]: null }))

    // Get vote turnstile token
    let turnstileToken = voteTurnstileTokens.current[tokenId]

    // If no token yet, render widget first
    if (!turnstileToken) {
      setVoteMsg(m => ({ ...m, [tokenId]: { type: 'info', text: 'Complete the captcha below to vote' } }))
      setVotingId(null)
      return
    }

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, turnstileToken })
      })
      const data = await res.json()

      if (data.success) {
        setVotedIds(v => new Set([...v, tokenId]))
        setVoteMsg(m => ({
          ...m,
          [tokenId]: {
            type: 'success',
            text: data.qualified ? `🎉 Token qualified! ${data.votes} votes` : `✅ Voted! ${data.votes}/${VOTES_TO_QUALIFY} votes`
          }
        }))
        fetchTokens()
      } else {
        setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: data.error } }))
      }
    } catch (e) {
      setVoteMsg(m => ({ ...m, [tokenId]: { type: 'error', text: 'Network error' } }))
    } finally {
      setVotingId(null)
      voteTurnstileTokens.current[tokenId] = null
    }
  }

  const renderVoteTurnstile = (tokenId) => {
    if (!TURNSTILE_SITE_KEY) return
    const el = voteTurnstileRefs.current[tokenId]
    if (!el || el.dataset.rendered) return
    el.dataset.rendered = '1'
    const checkAndRender = () => {
      if (window.turnstile) {
        window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            voteTurnstileTokens.current[tokenId] = token
            setVoteMsg(m => ({ ...m, [tokenId]: { type: 'info', text: 'Captcha done! Click Vote again.' } }))
          }
        })
      } else { setTimeout(checkAndRender, 500) }
    }
    checkAndRender()
  }

  const pending = tokens.filter(t => t.status === 'pending')
  const queued = tokens.filter(t => t.status === 'queued')

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <div className="section-label">◈ NOMINATION ARENA</div>
          <h1 style={{ fontSize: 24, letterSpacing: 3, marginBottom: 8 }}>NOMINATE A TOKEN</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
            Submit any Solana token contract address. Get <strong style={{ color: 'var(--accent)' }}>50 votes</strong> to qualify for the next race.
          </p>
        </div>

        {/* SUBMIT FORM */}
        <div className="card fade-in-up" style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: 2, color: 'var(--text2)', marginBottom: 16 }}>
            SUBMIT CONTRACT ADDRESS
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 260 }}
              placeholder="Solana contract address (e.g. 7xKX...)"
              value={ca}
              onChange={e => setCa(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !ca.trim()}
            >
              {submitting ? 'CHECKING...' : 'SUBMIT TOKEN'}
            </button>
          </div>

          {/* Turnstile for nominate */}
          <div ref={nominateTurnstileRef} style={{ marginBottom: 12 }} />

          {submitMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 4,
              fontSize: 12,
              background: submitMsg.type === 'success' ? 'rgba(0,245,160,0.08)' : 'rgba(255,61,107,0.08)',
              color: submitMsg.type === 'success' ? 'var(--accent)' : 'var(--danger)',
              border: `1px solid ${submitMsg.type === 'success' ? 'rgba(0,245,160,0.2)' : 'rgba(255,61,107,0.2)'}`
            }}>
              {submitMsg.text}
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            ◾ Token must be on Solana and listed on DexScreener<br />
            ◾ Submission is free — no fees<br />
            ◾ 50 votes needed to qualify for the race
          </div>
        </div>

        {/* QUEUE */}
        {queued.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', align: 'center', gap: 10, marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>✅ QUALIFIED — RACE QUEUE</div>
              <span className="badge badge-green">{queued.length} / 10 READY</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {queued.map(token => (
                <div key={token.id} className="card" style={{
                  borderTop: '2px solid var(--accent)',
                  background: 'linear-gradient(135deg, var(--surface), rgba(0,245,160,0.04))'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {token.logo_url && (
                      <img src={token.logo_url} alt={token.name}
                        style={{ width: 32, height: 32, borderRadius: '50%' }}
                        onError={e => e.target.style.display = 'none'} />
                    )}
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

        {/* VOTING ARENA */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>◈ VOTING ARENA — GET 50 VOTES TO QUALIFY</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pending.length} tokens</div>
          </div>

          {loadingTokens && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', letterSpacing: 2 }}>
              LOADING...
            </div>
          )}

          {!loadingTokens && pending.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              No tokens nominated yet. Be the first!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(token => {
              const pct = Math.min((token.votes / VOTES_TO_QUALIFY) * 100, 100)
              const voted = votedIds.has(token.id)
              const msg = voteMsg[token.id]

              return (
                <div key={token.id} className="card fade-in" style={{
                  borderLeft: `3px solid ${pct === 100 ? 'var(--accent)' : 'var(--border)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

                    {/* Logo + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                      {token.logo_url ? (
                        <img src={token.logo_url} alt={token.name}
                          style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border2)' }}
                          onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'var(--surface2)', border: '1px solid var(--border2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text2)'
                        }}>
                          {token.ticker?.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                          {token.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                          ${token.ticker} · {formatMcap(token.current_mcap)} · {timeAgo(token.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Vote progress */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>
                        <span>{token.votes} votes</span>
                        <span>{VOTES_TO_QUALIFY - token.votes} needed</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: pct + '%',
                          background: pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--warn)' : 'var(--border2)',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    {/* Vote button */}
                    <div style={{ flexShrink: 0 }}>
                      <button
                        className={`btn ${voted ? 'btn-outline' : 'btn-primary'}`}
                        style={{ opacity: voted ? 0.5 : 1, fontSize: 10, padding: '8px 16px' }}
                        disabled={voted || votingId === token.id}
                        onClick={() => {
                          if (!voteTurnstileTokens.current[token.id]) {
                            renderVoteTurnstile(token.id)
                          }
                          handleVote(token.id)
                        }}
                      >
                        {voted ? '✓ VOTED' : votingId === token.id ? 'VOTING...' : '▲ VOTE'}
                      </button>
                    </div>
                  </div>

                  {/* Vote captcha */}
                  <div
                    ref={el => { voteTurnstileRefs.current[token.id] = el }}
                    style={{ marginTop: 8 }}
                  />

                  {msg && (
                    <div style={{
                      marginTop: 8, fontSize: 11, padding: '6px 10px', borderRadius: 3,
                      background: msg.type === 'success' ? 'rgba(0,245,160,0.08)' : msg.type === 'error' ? 'rgba(255,61,107,0.08)' : 'rgba(0,217,245,0.08)',
                      color: msg.type === 'success' ? 'var(--accent)' : msg.type === 'error' ? 'var(--danger)' : 'var(--accent2)'
                    }}>
                      {msg.text}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
