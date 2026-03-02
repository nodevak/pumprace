'use client'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { formatMcap, timeAgo } from '../../lib/format'

export default function HallOfFamePage() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(r => r.json())
      .then(d => setWinners(d.winners || []))
      .finally(() => setLoading(false))
  }, [])

  const getMcapChange = (w) => {
    const s = Number(w.start_mcap), f = Number(w.final_mcap)
    if (!s) return 0
    return ((f - s) / s * 100)
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
          <div className="section-label" style={{ justifyContent: 'center', display: 'flex' }}>◈ CHAMPION ARCHIVE</div>
          <h1 style={{ fontSize: 28, letterSpacing: 4, marginBottom: 10, background: 'linear-gradient(135deg, var(--warn), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HALL OF FAME
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Every race winner becomes the official PUMPRACE treasury token.
            Platform fees are distributed to the winner's community.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', letterSpacing: 2 }}>
            LOADING CHAMPIONS...
          </div>
        )}

        {!loading && winners.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--muted)', letterSpacing: 2 }}>
              NO RACES COMPLETED YET
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              The first champion will be crowned here after the inaugural race ends.
            </div>
          </div>
        )}

        {/* WINNER #1 SPOTLIGHT */}
        {winners.length > 0 && (
          <div className="card fade-in-up" style={{
            background: 'linear-gradient(135deg, rgba(255,184,0,0.06), rgba(0,245,160,0.04))',
            border: '1px solid rgba(255,184,0,0.3)',
            marginBottom: 24,
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Crown glow */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120,
              background: 'radial-gradient(circle, rgba(255,184,0,0.15), transparent)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 40 }}>👑</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--warn)', marginBottom: 4 }}>
                  LATEST CHAMPION · RACE #{winners[0].race_id}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: 'var(--warn)', letterSpacing: 2 }}>
                  {winners[0].name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                  ${winners[0].ticker} · {winners[0].contract_address?.slice(0, 16)}...
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>FINAL MCAP</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  {formatMcap(winners[0].final_mcap)}
                </div>
                <div style={{ fontSize: 12, color: getMcapChange(winners[0]) >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>
                  {getMcapChange(winners[0]) >= 0 ? '+' : ''}{getMcapChange(winners[0]).toFixed(1)}% during race
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div className="badge badge-yellow" style={{ marginBottom: 8, display: 'inline-flex' }}>🏆 TREASURY TOKEN</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(winners[0].ended_at)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ALL WINNERS TABLE */}
        {winners.length > 1 && (
          <div className="card fade-in">
            <div className="section-label" style={{ marginBottom: 16 }}>◈ ALL CHAMPIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {winners.map((w, i) => {
                const chg = getMcapChange(w)
                return (
                  <div key={w.race_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    background: 'var(--surface2)',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 900,
                      color: i === 0 ? 'var(--warn)' : 'var(--muted)',
                      minWidth: 28
                    }}>
                      {i === 0 ? '👑' : `#${i + 1}`}
                    </div>

                    {w.logo_url && (
                      <img src={w.logo_url} alt={w.name}
                        style={{ width: 32, height: 32, borderRadius: '50%' }}
                        onError={e => e.target.style.display = 'none'} />
                    )}

                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text)', letterSpacing: 1 }}>
                        {w.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        ${w.ticker} · Race #{w.race_id} · {timeAgo(w.ended_at)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text)' }}>
                        {formatMcap(w.final_mcap)}
                      </div>
                      <div style={{ fontSize: 10, color: chg >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>
                        {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
