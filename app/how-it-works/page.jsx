import Navbar from '../components/Navbar'
import Link from 'next/link'

const steps = [
  { num:'01', icon:'📝', title:'NOMINATE', color:'#00e5cc', desc:'Submit your Solana token contract address. We auto-fetch name, ticker, logo, and market cap from DexScreener. Completely free.' },
  { num:'02', icon:'🗳️', title:'EARN VOTES', color:'#c9a84c', desc:'Share with your community. Anyone can vote — no wallet or login needed. 1 vote per IP per token. Hit 50 votes to enter the race queue.' },
  { num:'03', icon:'🏁', title:'RACE BEGINS', color:'#a78bfa', desc:'When 10 tokens are queued, the race launches automatically. Each race lasts exactly 4 hours. Market cap tracked every 30 seconds.' },
  { num:'04', icon:'📊', title:'LIVE CHART', color:'#00e5cc', desc:'Watch all 10 tokens race in real time. Tokens dropping 95%+ from their start mcap are flagged as rugged and disqualified.' },
  { num:'05', icon:'👑', title:'WINNER', color:'#c9a84c', desc:'After 4 hours the highest market cap token wins. Immortalized in the Hall of Fame as the official PUMPRACE Treasury Token.' },
  { num:'06', icon:'💰', title:'TREASURY', color:'#e63950', desc:'Platform fees from the race period are distributed to the winning community. Announced publicly with full transaction hashes.' },
]

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 48 }}>

        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="section-label" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>◈ THE RULEBOOK</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 7vw, 60px)', letterSpacing: 6, marginBottom: 16, lineHeight: 1 }}>HOW IT WORKS</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, maxWidth: 500, margin: '0 auto', lineHeight: 1.9 }}>The ultimate Solana market cap battle arena. 4 hours. 10 tokens. One winner takes everything.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 48 }}>
          {steps.map((step, i) => (
            <div key={i} className="card fade-in-up" style={{ animationDelay: `${i * 0.08}s`, borderTop: `2px solid ${step.color}20`, borderLeft: `3px solid ${step.color}`, padding: '28px 28px' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: step.color, opacity: 0.15, lineHeight: 1, flexShrink: 0 }}>{step.num}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 24 }}>{step.icon}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: step.color }}>{step.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card fade-in" style={{ background: 'linear-gradient(135deg, rgba(230,57,80,0.05), rgba(12,10,24,0.95))', border: '1px solid rgba(230,57,80,0.15)', marginBottom: 40, padding: '32px 36px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,57,80,0.3), transparent)' }} />
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>⚠️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: '#e63950', marginBottom: 12 }}>IMPORTANT — READ THIS</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
                Treasury distribution is <strong style={{ color: 'var(--text)' }}>handled manually</strong>, not via smart contract. All payouts are announced publicly with on-chain transaction hashes for full transparency.<br /><br />
                <span style={{ color: 'var(--gold)' }}>PUMPRACE is a community experiment. Never invest more than you can afford to lose.</span>
              </p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/nominate" className="btn btn-primary" style={{ fontSize: 13, padding: '16px 40px', letterSpacing: 3 }}>NOMINATE YOUR TOKEN →</Link>
        </div>
      </div>
    </>
  )
}
