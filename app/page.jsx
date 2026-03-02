'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from './components/Navbar'
import { formatMcap, formatTime } from '../lib/format'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const TOKEN_COLORS = [
  '#00f5a0','#00d9f5','#ff3d6b','#ffb800',
  '#a855f7','#ff6b35','#06b6d4','#84cc16',
  '#f43f5e','#8b5cf6'
]

const POLL_INTERVAL = 30000 // 30 seconds

export default function HomePage() {
  const [race, setRace] = useState(null)
  const [entries, setEntries] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const timerRef = useRef(null)

  const fetchRace = useCallback(async () => {
    try {
      const res = await fetch('/api/race')
      const data = await res.json()
      setRace(data.race)
      setEntries(data.entries || [])
      setSnapshots(data.snapshots || {})
      if (data.timeLeftSeconds !== null) setTimeLeft(data.timeLeftSeconds)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Fetch race error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRace()
    const pollInterval = setInterval(fetchRace, POLL_INTERVAL)
    return () => clearInterval(pollInterval)
  }, [fetchRace])

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (timeLeft === null || race?.status !== 'live') return

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft, race?.status])

  const sorted = [...entries].sort((a, b) => Number(b.current_mcap) - Number(a.current_mcap))

  const timerPct = timeLeft !== null ? (timeLeft / (4 * 3600)) * 100 : 100
  const timerClass = timeLeft < 600 ? 'critical' : timeLeft < 1800 ? 'warning' : ''

  // Build chart data
  const buildChartData = () => {
    if (!entries.length) return null

    // Get all timestamps from first entry
    const firstSnaps = snapshots[entries[0]?.token_id] || []
    const labels = firstSnaps.map((_, i) => {
      const totalPoints = firstSnaps.length
      const elapsed = (4 * 3600) - (timeLeft || 0)
      const pointTime = (elapsed / totalPoints) * i
      const h = Math.floor(pointTime / 3600)
      const m = Math.floor((pointTime % 3600) / 60)
      return `${h}:${m.toString().padStart(2, '0')}`
    })

    const datasets = entries.map((entry, i) => {
      const snaps = snapshots[entry.token_id] || []
      return {
        label: `$${entry.ticker}`,
        data: snaps.map(s => Number(s.mcap)),
        borderColor: TOKEN_COLORS[i % TOKEN_COLORS.length],
        backgroundColor: TOKEN_COLORS[i % TOKEN_COLORS.length] + '12',
        borderWidth: entry.is_rugged ? 1 : 2.5,
        borderDash: entry.is_rugged ? [4, 4] : [],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: TOKEN_COLORS[i % TOKEN_COLORS.length],
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      }
    })

    return { labels: labels.length ? labels : ['Start'], datasets }
  }

  const chartData = buildChartData()

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#3d4670',
          font: { family: 'var(--font-mono), monospace', size: 10 },
          boxWidth: 16, boxHeight: 2, padding: 12,
          usePointStyle: false,
        }
      },
      tooltip: {
        backgroundColor: '#080a17',
        borderColor: '#161b36',
        borderWidth: 1,
        titleColor: '#3d4670',
        bodyColor: '#dde4ff',
        titleFont: { family: 'var(--font-mono), monospace', size: 10 },
        bodyFont: { family: 'var(--font-orbitron), monospace', size: 11, weight: 'bold' },
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMcap(ctx.raw)}` }
      }
    },
    scales: {
      x: {
        grid: { color: '#161b3644', drawBorder: false },
        ticks: { color: '#3d4670', font: { family: 'var(--font-mono)', size: 9 }, maxTicksLimit: 8, maxRotation: 0 },
        border: { display: false }
      },
      y: {
        grid: { color: '#161b3644', drawBorder: false },
        ticks: { color: '#3d4670', font: { family: 'var(--font-mono)', size: 9 }, callback: v => formatMcap(v) },
        border: { display: false }
      }
    },
    animation: { duration: 300 }
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>

        {/* HERO TIMER */}
        {race?.status === 'live' && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="section-label">⏱ race ends in</div>
            <div className={`timer-display ${timerClass}`} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 52,
              fontWeight: 900,
              color: timerClass === 'critical' ? 'var(--danger)' : timerClass === 'warning' ? 'var(--warn)' : 'var(--accent)',
              textShadow: timerClass === 'critical' ? '0 0 30px rgba(255,61,107,0.5)' : '0 0 30px rgba(0,245,160,0.3)',
              letterSpacing: 6,
              animation: timerClass === 'critical' ? 'blink 0.6s infinite' : 'none'
            }}>
              {timeLeft !== null ? formatTime(timeLeft) : '--:--:--'}
            </div>
            <div style={{ maxWidth: 500, margin: '10px auto 0', height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: timerPct + '%',
                transition: 'width 1s linear',
                background: timerClass === 'critical' ? 'var(--danger)' : timerClass === 'warning' ? 'var(--warn)' : 'linear-gradient(90deg, var(--accent), var(--accent2))',
                boxShadow: '0 0 10px currentColor'
              }} />
            </div>
          </div>
        )}

        {/* WAITING STATE */}
        {race?.status === 'waiting' && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '48px 20px', marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
            <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>NEXT RACE LOADING</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
              Race starts automatically when 10 tokens qualify (50 votes each)
            </p>
            <Link href="/nominate" className="btn btn-primary">Nominate a Token →</Link>
          </div>
        )}

        {/* NO RACE */}
        {!race && !loading && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '48px 20px', marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>FIRST RACE COMING SOON</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
              Nominate your token and get 50 votes to qualify for the first race.
            </p>
            <Link href="/nominate" className="btn btn-primary">Nominate a Token →</Link>
          </div>
        )}

        {/* MAIN CHART */}
        {race?.status === 'live' && chartData && (
          <div className="card fade-in" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="section-label">◈ LIVE MCAP RACE</div>
                {lastUpdate && (
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    Updated {lastUpdate.toLocaleTimeString()} · refreshes every 30s
                  </div>
                )}
              </div>
              <div className="live-dot">LIVE</div>
            </div>
            <div style={{ height: 360 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {race?.status === 'live' && sorted.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-label">◈ STANDINGS</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>{sorted.filter(e => !e.is_rugged).length} RACING</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((entry, rank) => {
                const color = TOKEN_COLORS[entries.findIndex(e => e.token_id === entry.token_id) % TOKEN_COLORS.length]
                const startMcap = Number(entry.start_mcap)
                const currentMcap = Number(entry.current_mcap)
                const changePct = startMcap > 0 ? ((currentMcap - startMcap) / startMcap * 100) : 0
                const isLeader = rank === 0 && !entry.is_rugged

                return (
                  <div key={entry.token_id} style={{
                    background: isLeader ? `linear-gradient(135deg, var(--surface), ${color}08)` : 'var(--surface)',
                    border: `1px solid ${isLeader ? color + '44' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'all 0.3s',
                    opacity: entry.is_rugged ? 0.5 : 1,
                    borderLeft: `3px solid ${entry.is_rugged ? 'var(--muted)' : color}`
                  }}>
                    {/* Rank */}
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontWeight: 900,
                      color: rank === 0 ? color : 'var(--muted)',
                      minWidth: 32,
                      textAlign: 'center'
                    }}>
                      {entry.is_rugged ? '💀' : `#${rank + 1}`}
                    </div>

                    {/* Logo */}
                    {entry.logo_url ? (
                      <img src={entry.logo_url} alt={entry.name}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${color}44`, flexShrink: 0 }}
                        onError={e => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: color + '22', border: `1px solid ${color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color, flexShrink: 0
                      }}>
                        {entry.ticker?.slice(0, 2)}
                      </div>
                    )}

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color, letterSpacing: 1 }}>
                        {entry.name}
                        {isLeader && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--warn)' }}>👑 LEADING</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginTop: 2 }}>
                        ${entry.ticker} · {entry.contract_address?.slice(0, 8)}...
                        {entry.is_rugged && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>RUGGED</span>}
                      </div>
                    </div>

                    {/* Mcap */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        {formatMcap(entry.current_mcap)}
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: 1,
                        color: changePct >= 0 ? 'var(--accent)' : 'var(--danger)'
                      }}>
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TREASURY INFO BANNER */}
        <div className="card fade-in" style={{
          background: 'linear-gradient(135deg, rgba(255,184,0,0.06), rgba(168,85,247,0.06))',
          border: '1px solid rgba(255,184,0,0.2)',
          marginBottom: 24,
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: 32 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--warn)', letterSpacing: 2, marginBottom: 4 }}>
              WINNER TAKES THE TREASURY
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              The winning token of each race is declared the <strong style={{ color: 'var(--text)' }}>official PUMPRACE treasury token</strong>.
              All platform fees generated by PUMPRACE are manually distributed to the winner's community wallet.
              This is handled transparently and announced after each race.
            </div>
          </div>
          <Link href="/how-it-works" className="btn btn-outline" style={{ flexShrink: 0 }}>
            How it works →
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', letterSpacing: 2 }}>
            LOADING RACE DATA...
          </div>
        )}
      </div>
    </>
  )
}
