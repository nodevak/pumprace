'use client'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { formatMcap, timeAgo } from '../../lib/format'

export default function HallOfFamePage() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hall-of-fame').then(r => r.json()).then(d => setWinners(d.winners || [])).finally(() => setLoading(false))
  }, [])

  const chg = (w) => {
    const s = Number(w.start_mcap), f = Number(w.final_mcap)
    return s > 0 ? ((f - s) / s * 100) : 0
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 48 }}>

        {/* HEADER */}
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 72, marginBottom: 16, animation: 'crownFloat 3s ease-in-out infinite' }}>👑</div>
          <div className="section-label" style={{ justifyContent: 'center', display: 'flex', marginBottom: 12 }}>◈ CHAMPION ARCHIVE</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 8vw, 64px)', letterSpacing: 8, lineHeight: 1, marginBottom: 16, background: 'linear-gradient(135deg, var(--gold3), var(--gold), var(--gold2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HALL OF FAME</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, maxWidth: 480, margin: '0 auto', lineHeight: 1.9 }}>Every race winner becomes the official PUMPRACE Treasury Token. Platform fees go to the winner's community.</p>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)', letterSpacing: 4, fontFamily: 'var(--font-display)', fontSize: 18 }}>LOADING CHAMPIONS...</div>}

        {!loading && winners.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏁</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 4, color: 'var(--muted)' }}>NO RACES COMPLETED YET</div>
            <p style={{ color: 'var(--text2)', marginTop: 12, fontSize: 13 }}>The first champion will be crowned soon.</p>
          </div>
        )}

        {/* LATEST CHAMPION */}
        {winners.length > 0 && (
          <div className="fade-in-up" style={{ marginBottom: 32 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(12,10,24,0.95), rgba(201,168,76,0.04))',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 20, padding: '40px 36px',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 80px rgba(201,168,76,0.08), 0 32px 80px rgba(0,0,0,0.5)'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), rgba(240,208,128,0.8), var(--gold), transparent)' }} />
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 56, animation: 'crownFloat 3s ease-in-out infinite', flexShrink: 0 }}>👑</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 9, letterSpacing: 5, color: 'var(--gold)', marginBottom: 6, opacity: 0.7 }}>LATEST CHAMPION · RACE #{winners[0].race_id}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 40px)', letterSpacing: 3, color: 'var(--gold)', lineHeight: 1 }}>{winners[0].name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8 }}>${winners[0].ticker} · {winners[0].contract_address?.slice(0,20)}...</div>
                </div>
                {winners[0].logo_url && <img src={winners[0].logo_url} alt={winners[0].name} style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.3)', boxShadow: '0 0 30px rgba(201,168,76,0.2)' }} onError={e => e.target.style.display='none'} />}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 3, marginBottom: 6 }}>FINAL MCAP</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)' }}>{formatMcap(winners[0].final_mcap)}</div>
                  <div style={{ fontSize: 12, color: chg(winners[0]) >= 0 ? 'var(--teal)' : '#e63950', fontWeight: 500, marginTop: 4 }}>
                    {chg(winners[0]) >= 0 ? '▲' : '▼'} {Math.abs(chg(winners[0])).toFixed(1)}% during race
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{timeAgo(winners[0].ended_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALL CHAMPIONS */}
        {winners.length > 1 && (
          <div className="card fade-in">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, marginBottom: 20 }}>ALL CHAMPIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {winners.map((w, i) => (
                <div key={w.race_id} className="rank-row" style={{ borderLeft: `3px solid ${i === 0 ? 'var(--gold)' : 'var(--border2)'}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: i === 0 ? 'var(--gold)' : 'var(--muted)', minWidth: 32, animation: i === 0 ? 'crownFloat 3s ease-in-out infinite' : 'none' }}>{i === 0 ? '👑' : `#${i+1}`}</div>
                  {w.logo_url && <img src={w.logo_url} alt={w.name} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border2)' }} onError={e => e.target.style.display='none'} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 1.5, color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>{w.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>${w.ticker} · Race #{w.race_id} · {timeAgo(w.ended_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{formatMcap(w.final_mcap)}</div>
                    <div style={{ fontSize: 10, color: chg(w) >= 0 ? 'var(--teal)' : '#e63950' }}>{chg(w) >= 0 ? '▲' : '▼'} {Math.abs(chg(w)).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
