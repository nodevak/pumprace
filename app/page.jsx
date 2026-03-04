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
  const positionsRef = useRef({})
  const imagesRef = useRef({})

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

  // Preload token images
  useEffect(() => {
    entries.forEach(entry => {
      if (entry.logo_url && !imagesRef.current[entry.token_id]) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => { imagesRef.current[entry.token_id] = img }
        img.onerror = () => { imagesRef.current[entry.token_id] = null }
        img.src = entry.logo_url
      }
    })
  }, [entries])

  // Canvas race track
  useEffect(() => {
    if (!canvasRef.current || !entries.length || race?.status !== 'live') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Sort entries by mcap descending — leader is row 0
    const sorted = [...entries].sort((a, b) => Number(b.current_mcap) - Number(a.current_mcap))

    // Calculate target positions: 0 = start, 1 = finish
    // Use relative mcap spread so tokens don't all bunch at finish
    const mcaps = sorted.map(e => Number(e.current_mcap))
    const maxMcap = Math.max(...mcaps)
    const minMcap = Math.min(...mcaps)
    const range = maxMcap - minMcap

    function getTarget(entry) {
      if (entry.is_rugged) return 0.02
      const mcap = Number(entry.current_mcap)
      if (range === 0) return 0.5 // all equal — put in middle
      // Leader gets 0.92, last gets 0.08, everyone else proportional
      return 0.08 + ((mcap - minMcap) / range) * 0.84
    }

    sorted.forEach(e => {
      if (positionsRef.current[e.token_id] === undefined) {
        positionsRef.current[e.token_id] = getTarget(e) * 0.3
      }
    })

    const PADDING_LEFT = 120
    const PADDING_RIGHT = 72
    const LANE_HEIGHT = 68

    function lerp(a, b, t) { return a + (b - a) * t }

    function drawRoundedImage(ctx, img, x, y, r) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2)
      ctx.restore()
    }

    function draw() {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const TRACK_WIDTH = W - PADDING_LEFT - PADDING_RIGHT

      sorted.forEach((entry, i) => {
        const laneY = i * LANE_HEIGHT
        const midY = laneY + LANE_HEIGHT / 2
        const color = COLORS[entries.findIndex(e => e.token_id === entry.token_id) % COLORS.length]
        const isLeader = i === 0 && !entry.is_rugged

        const target = getTarget(entry)
        const cur = positionsRef.current[entry.token_id] ?? target
        positionsRef.current[entry.token_id] = lerp(cur, target, 0.04)
        const pos = positionsRef.current[entry.token_id]
        const tokenX = PADDING_LEFT + pos * TRACK_WIDTH

        // Lane bg
        const laneGrad = ctx.createLinearGradient(0, laneY, 0, laneY + LANE_HEIGHT)
        laneGrad.addColorStop(0, `${color}0a`)
        laneGrad.addColorStop(0.5, `${color}05`)
        laneGrad.addColorStop(1, `${color}0a`)
        ctx.fillStyle = laneGrad
        ctx.fillRect(0, laneY, W, LANE_HEIGHT)

        // Lane separator
        ctx.strokeStyle = '#1e1a3540'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, laneY + LANE_HEIGHT)
        ctx.lineTo(W, laneY + LANE_HEIGHT)
        ctx.stroke()

        // Dashed center line
        ctx.setLineDash([5, 10])
        ctx.strokeStyle = `${color}18`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PADDING_LEFT, midY)
        ctx.lineTo(W - PADDING_RIGHT, midY)
        ctx.stroke()
        ctx.setLineDash([])

        // Token name left
        ctx.textAlign = 'right'
        ctx.font = `500 11px 'DM Mono', monospace`
        ctx.fillStyle = entry.is_rugged ? '#3d3660' : color
        ctx.fillText(`$${entry.ticker}`, PADDING_LEFT - 10, midY - 5)
        ctx.font = `300 9px 'DM Mono', monospace`
        ctx.fillStyle = '#3d3660'
        ctx.fillText(formatMcap(entry.current_mcap), PADDING_LEFT - 10, midY + 9)

        // Trail
        if (!entry.is_rugged) {
          const trailGrad = ctx.createLinearGradient(PADDING_LEFT, 0, tokenX, 0)
          trailGrad.addColorStop(0, 'transparent')
          trailGrad.addColorStop(1, `${color}22`)
          ctx.fillStyle = trailGrad
          ctx.fillRect(PADDING_LEFT, midY - 2, tokenX - PADDING_LEFT, 4)
        }

        // Leader glow
        if (isLeader) {
          const glow = ctx.createRadialGradient(tokenX, midY, 0, tokenX, midY, 36)
          glow.addColorStop(0, `${color}50`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(tokenX, midY, 36, 0, Math.PI * 2)
          ctx.fill()
        }

        // Token circle
        const radius = isLeader ? 22 : entry.is_rugged ? 13 : 18
        const img = imagesRef.current[entry.token_id]

        if (img) {
          // Draw circular image
          ctx.save()
          ctx.beginPath()
          ctx.arc(tokenX, midY, radius, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, tokenX - radius, midY - radius, radius * 2, radius * 2)
          ctx.restore()
          // Border ring
          ctx.beginPath()
          ctx.arc(tokenX, midY, radius, 0, Math.PI * 2)
          ctx.strokeStyle = entry.is_rugged ? '#3d3660' : color
          ctx.lineWidth = isLeader ? 2.5 : 1.5
          ctx.stroke()
        } else {
          // Fallback colored circle
          ctx.beginPath()
          ctx.arc(tokenX, midY, radius, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(tokenX - 4, midY - 4, 0, tokenX, midY, radius)
          grad.addColorStop(0, entry.is_rugged ? '#1e1a35' : color + 'ff')
          grad.addColorStop(1, entry.is_rugged ? '#0c0a18' : color + '55')
          ctx.fillStyle = grad
          ctx.fill()
          ctx.strokeStyle = entry.is_rugged ? '#3d3660' : color
          ctx.lineWidth = isLeader ? 2.5 : 1.5
          ctx.stroke()
          // Initials
          ctx.font = `bold ${isLeader ? 12 : 10}px 'DM Mono', monospace`
          ctx.fillStyle = entry.is_rugged ? '#3d3660' : '#000'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(entry.ticker?.slice(0, 2).toUpperCase(), tokenX, midY)
          ctx.textBaseline = 'alphabetic'
        }

        // Crown above leader
        if (isLeader) {
          ctx.font = '14px serif'
          ctx.textAlign = 'center'
          ctx.fillText('👑', tokenX, midY - radius - 4)
        }

        // Rank + % on right
        const chg = Number(entry.start_mcap) > 0
          ? ((Number(entry.current_mcap) - Number(entry.start_mcap)) / Number(entry.start_mcap) * 100)
          : 0
        ctx.textAlign = 'left'
        ctx.font = `500 10px 'DM Mono', monospace`
        ctx.fillStyle = isLeader ? '#c9a84c' : '#3d3660'
        ctx.fillText(`#${i + 1}`, W - PADDING_RIGHT + 10, midY - 4)
        ctx.font = `300 9px 'DM Mono', monospace`
        ctx.fillStyle = chg > 0 ? '#00e5cc' : chg < 0 ? '#e63950' : '#3d3660'
        ctx.fillText(`${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%`, W - PADDING_RIGHT + 10, midY + 8)
      })

      // START LINE
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.moveTo(PADDING_LEFT, 0)
      ctx.lineTo(PADDING_LEFT, sorted.length * LANE_HEIGHT)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = `400 9px 'DM Mono', monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.textAlign = 'center'
      ctx.fillText('START', PADDING_LEFT, sorted.length * LANE_HEIGHT + 16)

      // FINISH LINE — checkered flag
      const FX = W - PADDING_RIGHT
      const cs = 8
      const totalH = sorted.length * LANE_HEIGHT
      for (let cy = 0; cy < totalH; cy += cs) {
        for (let cx = 0; cx < 2; cx++) {
          const white = (Math.floor(cy / cs) + cx) % 2 === 0
          ctx.fillStyle = white ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)'
          ctx.fillRect(FX + cx * cs - cs, cy, cs, Math.min(cs, totalH - cy))
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = `400 9px 'DM Mono', monospace`
      ctx.textAlign = 'center'
      ctx.fillText('FINISH', FX, totalH + 16)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [entries, race?.status])

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current) return
      const container = canvasRef.current.parentElement
      canvasRef.current.width = container.clientWidth
      canvasRef.current.height = entries.length * 68 + 28
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

        {/* WAITING */}
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
              borderRadius: 16, overflow: 'hidden', position: 'relative',
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
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 8, background: rank === 0 ? `${color}08` : 'transparent',
                    border: `1px solid ${rank === 0 ? color + '25' : 'transparent'}`,
                    opacity: entry.is_rugged ? 0.4 : 1
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: rank === 0 ? color : 'var(--muted)', minWidth: 28 }}>
                      {entry.is_rugged ? '💀' : rank === 0 ? '👑' : `#${rank + 1}`}
                    </div>
                    {entry.logo_url
                      ? <img src={entry.logo_url} alt={entry.name} style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${color}40` }} onError={e => e.target.style.display='none'} />
                      : <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}20`, border: `1px solid ${color}40`, flexShrink: 0 }} />
                    }
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
          border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16,
          padding: '32px 36px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
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