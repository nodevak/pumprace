'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from './components/Navbar'
import { formatMcap, formatTime } from '../lib/format'

const COLORS = ['#c9a84c','#00e5cc','#e63950','#a78bfa','#fb923c','#34d399','#60a5fa','#f472b6','#facc15','#94a3b8']

export default function HomePage() {
  const [race, setRace] = useState(null)
  const [entries, setEntries] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const positionsRef = useRef({}) // smooth animated positions

  const fetchRace = useCallback(async () => {
    try {
      const res = await fetch('/api/race')
      const data = await res.json()
      setRace(data.race)
      setEntries(data.entries || [])
      if (data.timeLeftSeconds !== null && data.timeLeftSeconds !== undefined) {
        setTimeLeft(Math.floor(data.timeLeftSeconds))
      }
      setLastUpdate(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchRace()
    const poll = setInterval(fetchRace, 30000)
    return () => clearInterval(poll)
  }, [fetchRace])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (timeLeft === null || race?.status !== 'live') return
    timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft, race?.status])

  // Canvas race track animation
  useEffect(() => {
    if (!canvasRef.current || !entries.length || race?.status !== 'live') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const maxMcap = Math.max(...entries.map(e => Number(e.current_mcap)))
    const minMcap = Math.min(...entries.map(e => Number(e.current_mcap)))
    const range = maxMcap - minMcap || 1

    // Init positions if needed
    entries.forEach(e => {
      if (positionsRef.current[e.token_id] === undefined) {
        positionsRef.current[e.token_id] = 0
      }
    })

    const PADDING_LEFT = 140
    const PADDING_RIGHT = 80
    const LANE_HEIGHT = 64
    const TRACK_WIDTH = canvas.width - PADDING_LEFT - PADDING_RIGHT

    function lerp(a, b, t) { return a + (b - a) * t }

    function draw(timestamp) {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#06050f'
      ctx.fillRect(0, 0, W, H)

      entries.forEach((entry, i) => {
        const y = i * LANE_HEIGHT
        const target = entry.is_rugged ? 0.02 : (Number(entry.current_mcap) - minMcap) / range
        const current = positionsRef.current[entry.token_id] ?? 0
        positionsRef.current[entry.token_id] = lerp(current, target, 0.05)
        const pos = positionsRef.current[entry.token_id]
        const color = COLORS[i % COLORS.length]
        const x = PADDING_LEFT + pos * TRACK_WIDTH
        const isLeader = i === 0

        // Lane background
        const laneGrad = ctx.createLinearGradient(0, y, 0, y + LANE_HEIGHT)
        laneGrad.addColorStop(0, `${color}08`)
        laneGrad.addColorStop(0.5, `${color}04`)
        laneGrad.addColorStop(1, `${color}08`)
        ctx.fillStyle = laneGrad
        ctx.fillRect(0, y, W, LANE_HEIGHT)

        // Lane separator
        ctx.strokeStyle = '#1e1a3530'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, y + LANE_HEIGHT)
        ctx.lineTo(W, y + LANE_HEIGHT)
        ctx.stroke()

        // Dashed track line
        ctx.setLineDash([6, 8])
        ctx.strokeStyle = `${color}20`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PADDING_LEFT, y + LANE_HEIGHT / 2)
        ctx.lineTo(W - PADDING_RIGHT, y + LANE_HEIGHT / 2)
        ctx.stroke()
        ctx.setLineDash([])

        // Token name left
        ctx.font = `500 11px 'DM Mono', monospace`
        ctx.fillStyle = entry.is_rugged ? '#3d3660' : color
        ctx.textAlign = 'right'
        ctx.fillText(`$${entry.ticker}`, PADDING_LEFT - 12, y + LANE_HEIGHT / 2 - 6)
        ctx.font = `300 9px 'DM Mono', monospace`
        ctx.fillStyle = '#3d3660'
        ctx.fillText(formatMcap(entry.current_mcap), PADDING_LEFT - 12, y + LANE_HEIGHT / 2 + 8)

        // Trail glow
        if (!entry.is_rugged) {
          const trailGrad = ctx.createLinearGradient(PADDING_LEFT, 0, x, 0)
          trailGrad.addColorStop(0, 'transparent')
          trailGrad.addColorStop(1, `${color}18`)
          ctx.fillStyle = trailGrad
          ctx.fillRect(PADDING_LEFT, y + LANE_HEIGHT / 2 - 2, x - PADDING_LEFT, 4)
        }

        // Glow behind token
        if (!entry.is_rugged && isLeader) {
          const glow = ctx.createRadialGradient(x, y + LANE_HEIGHT / 2, 0, x, y + LANE_HEIGHT / 2, 32)
          glow.addColorStop(0, `${color}40`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, y + LANE_HEIGHT / 2, 32, 0, Math.PI * 2)
          ctx.fill()
        }

        // Token circle
        const radius = entry.is_rugged ? 12 : isLeader ? 20 : 16
        ctx.beginPath()
        ctx.arc(x, y + LANE_HEIGHT / 2, radius, 0, Math.PI * 2)
        if (entry.is_rugged) {
          ctx.fillStyle = '#1e1a35'
        } else {
          const grad = ctx.createRadialGradient(x - 4, y + LANE_HEIGHT / 2 - 4, 0, x, y + LANE_HEIGHT / 2, radius)
          grad.addColorStop(0, color + 'ff')
          grad.addColorStop(1, color + '66')
          ctx.fillStyle = grad
        }
        ctx.fill()
        ctx.strokeStyle = entry.is_rugged ? '#3d3660' : color
        ctx.lineWidth = isLeader ? 2.5 : 1.5
        ctx.stroke()

        // Token symbol or emoji
        ctx.font = `bold ${entry.is_rugged ? 10 : isLeader ? 13 : 11}px 'DM Mono', monospace`
        ctx.fillStyle = entry.is_rugged ? '#3d3660' : '#000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = entry.is_rugged ? '💀' : entry.ticker?.slice(0, 2).toUpperCase()
        ctx.fillText(label, x, y + LANE_HEIGHT / 2)
        ctx.textBaseline = 'alphabetic'

        // Rank on right
        ctx.font = `400 10px 'DM Mono', monospace`
        ctx.fillStyle = isLeader ? 'var(--gold, #c9a84c)' : '#3d3660'
        ctx.textAlign = 'left'
        const chg = Number(entry.start_mcap) > 0 ? ((Number(entry.current_mcap) - Number(entry.start_mcap)) / Number(entry.start_mcap) * 100) : 0
        ctx.fillStyle = isLeader ? '#c9a84c' : '#3d3660'
        ctx.fillText(`#${i + 1}`, W - PADDING_RIGHT + 10, y + LANE_HEIGHT / 2 - 4)
        ctx.font = `300 9px 'DM Mono', monospace`
        ctx.fillStyle = chg > 0 ? '#00e5cc' : chg < 0 ? '#e63950' : '#3d3660'
        ctx.fillText(`${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%`, W - PADDING_RIGHT + 10, y + LANE_HEIGHT / 2 + 8)
      })

      // START LINE
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(PADDING_LEFT, 0)
      ctx.lineTo(PADDING_LEFT, entries.length * LANE_HEIGHT)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = `500 9px 'DM Mono', monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.textAlign = 'center'
      ctx.fillText('START', PADDING_LEFT, entries.length * LANE_HEIGHT + 16)

      // FINISH LINE — checkered
      const FX = W - PADDING_RIGHT
      const checkSize = 8
      const totalH = entries.length * LANE_HEIGHT
      for (let cy = 0; cy < totalH; cy += checkSize) {
        for (let cx = 0; cx < 2; cx++) {
          const isWhite = (Math.floor(cy / checkSize) + cx) % 2 === 0
          ctx.fillStyle = isWhite ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'
          ctx.fillRect(FX + cx * checkSize - checkSize, cy, checkSize, Math.min(checkSize, totalH - cy))
        }
      }
      ctx.font = `500 9px 'DM Mono', monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.textAlign = 'center'
      ctx.fillText('FINISH', FX, totalH + 16)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [entries, race?.status])

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current) return
      const container = canvasRef.current.parentElement
      canvasRef.current.width = container.clientWidth
      canvasRef.current.height = entries.length * 64 + 24
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [entries.length])

  const sorted = [...entries].sort((a, b) => Number(b.current_mcap) - Number(a.current_mcap))
  const isCritical = timeLeft !== null && timeLeft < 600
  const isWarning = timeLeft !== null && timeLeft < 1800 && !isCritical
  const timerColor = isCritical ? '#e63950' : isWarning ? '#f59e0b' : '#c9a84c'

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 40 }}>

        {/* TIMER */}
        {race?.status === 'live' && (
          <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(12,10,24,0.95), rgba(19,17,34,0.8))',
              border: `1px solid ${timerColor}30`,
              borderRadius: 20, padding: '28px 60px',
              boxShadow: `0 0 60px ${timerColor}10, 0 20px 60px rgba(0,0,0,0.5)`,
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${timerColor}60, transparent)` }} />
              <div className="section-label" style={{ marginBottom: 12, letterSpacing: 6 }}>⏱ RACE ENDS IN</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(52px, 10vw, 84px)',
                letterSpacing: 8, lineHeight: 1,
                color: timerColor,
                textShadow: `0 0 40px ${timerColor}60`,
                animation: isCritical ? 'timerPulse 0.8s infinite' : 'none'
              }}>
                {formatTime(timeLeft)}
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                <div className="live-dot">LIVE</div>
                {lastUpdate && <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2 }}>UPDATED {lastUpdate.toLocaleTimeString()}</span>}
              </div>
            </div>
          </div>
        )}

        {/* WAITING / NO RACE */}
        {race?.status === 'waiting' && (
          <div className="fade-in-up" style={{ textAlign: 'center', padding: '80px 20px', marginBottom: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16, animation: 'crownFloat 3s ease-in-out infinite' }}>🏁</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: 6, marginBottom: 12, color: 'var(--gold)' }}>NEXT RACE LOADING</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 28 }}>Race starts when 10 tokens qualify (50 votes each)</p>
            <Link href="/nominate" className="btn btn-primary">Nominate a Token →</Link>
          </div>
        )}
        {!race && !loading && (
          <div className="fade-in-up" style={{ textAlign: 'center', padding: '80px 20px', marginBottom: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: 6, marginBottom: 12, color: 'var(--gold)' }}>FIRST RACE COMING</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 28 }}>Nominate your token and get 50 votes to qualify.</p>
            <Link href="/nominate" className="btn btn-primary">Be First →</Link>
          </div>
        )}

        {/* RACE TRACK */}
        {race?.status === 'live' && entries.length > 0 && (
          <div className="fade-in" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div className="section-label">◈ LIVE RACE TRACK</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 4 }}>TOKEN RACE</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="live-dot" style={{ marginBottom: 4 }}>LIVE</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>UPDATES EVERY 30S</div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(145deg, rgba(12,10,24,0.98), rgba(6,5,15,0.95))',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
            </div>
          </div>
        )}

        {/* MINI STANDINGS */}
        {race?.status === 'live' && sorted.length > 0 && (
          <div className="card fade-in" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, marginBottom: 16, color: 'var(--text2)' }}>STANDINGS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sorted.map((entry, rank) => {
                const color = COLORS[entries.findIndex(e => e.token_id === entry.token_id) % COLORS.length]
                const chg = Number(entry.start_mcap) > 0 ? ((Number(entry.current_mcap) - Number(entry.start_mcap)) / Number(entry.start_mcap) * 100) : 0
                return (
                  <div key={entry.token_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    background: rank === 0 ? `${color}08` : 'transparent',
                    border: `1px solid ${rank === 0 ? color + '25' : 'transparent'}`,
                    opacity: entry.is_rugged ? 0.4 : 1
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: rank === 0 ? color : 'var(--muted)', minWidth: 28 }}>
                      {entry.is_rugged ? '💀' : rank === 0 ? '👑' : `#${rank + 1}`}
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.is_rugged ? 'var(--muted)' : color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1, color: rank === 0 ? color : 'var(--text)' }}>{entry.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>${entry.ticker}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: rank === 0 ? color : 'var(--text)', minWidth: 70, textAlign: 'right' }}>{formatMcap(entry.current_mcap)}</div>
                    <div style={{ fontSize: 10, color: chg > 0 ? 'var(--teal)' : chg < 0 ? '#e63950' : 'var(--muted)', minWidth: 52, textAlign: 'right' }}>
                      {chg > 0 ? '▲' : chg < 0 ? '▼' : '—'}{Math.abs(chg).toFixed(2)}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TREASURY */}
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.07), rgba(12,10,24,0.9))',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: 16, padding: '32px 36px',
          display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />
          <div style={{ fontSize: 44, animation: 'crownFloat 3s ease-in-out infinite', flexShrink: 0 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 4, color: 'var(--gold)', marginBottom: 8 }}>WINNER TAKES THE TREASURY</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              The winning token becomes the <strong style={{ color: 'var(--text)' }}>official PUMPRACE treasury token</strong>. Platform fees distributed to the winner's community.
            </div>
          </div>
          <Link href="/how-it-works" className="btn btn-outline" style={{ flexShrink: 0 }}>Learn More →</Link>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)', letterSpacing: 4, fontFamily: 'var(--font-display)', fontSize: 18 }}>LOADING RACE DATA...</div>}
      </div>
    </>
  )
}