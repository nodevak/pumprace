import Navbar from '../components/Navbar'
import Link from 'next/link'

const steps = [
  { num:'01', icon:'📝', title:'NOMINATE YOUR TOKEN', color:'#00d9f5', desc:'Submit your Solana token contract address. The site automatically fetches name, ticker, logo, and market cap from DexScreener. Completely free.' },
  { num:'02', icon:'🗳️', title:'EARN 50 VOTES', color:'#a855f7', desc:'Share your nomination with your community. Any visitor can vote — no wallet or account needed. 1 vote per IP per token. Hit 50 votes and your token auto-joins the race queue.' },
  { num:'03', icon:'🏁', title:'RACE BEGINS', color:'#ffb800', desc:'When 10 tokens are queued, the race starts automatically. Each race lasts exactly 4 hours. Market cap is tracked every 30 seconds via DexScreener.' },
  { num:'04', icon:'📊', title:'WATCH THE CHART', color:'#00f5a0', desc:'Live chart shows all 10 tokens racing to the highest market cap. If a token drops 95%+ from its starting mcap it is flagged as rugged and disqualified.' },
  { num:'05', icon:'🏆', title:'WINNER CROWNED', color:'#ffb800', desc:'After 4 hours the token with the highest market cap wins. The winner is immortalized in the Hall of Fame as the official PUMPRACE Treasury Token.' },
  { num:'06', icon:'💰', title:'TREASURY DISTRIBUTION', color:'#ff3d6b', desc:'All platform fees generated during the race period are manually distributed to the winning token\'s community treasury. Announced publicly with transaction hashes after each race.' },
]

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <div className="page-wrap" style={{ paddingTop: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-label" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>◈ THE RULEBOOK</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 4, marginBottom: 12 }}>HOW IT WORKS</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: 540, margin: '0 auto', lineHeight: 1.8 }}>The ultimate Solana market cap battle arena. Nominate your token, build community support, race to the top.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
          {steps.map((step, i) => (
            <div key={i} className="card fade-in-up" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', animationDelay: `${i*0.06}s`, borderLeft: `3px solid ${step.color}` }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: step.color, opacity: 0.2, lineHeight: 1, flexShrink: 0, minWidth: 48 }}>{step.num}</div>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{step.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: step.color, letterSpacing: 2, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card fade-in" style={{ background: 'linear-gradient(135deg, rgba(255,61,107,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(255,61,107,0.2)', marginBottom: 32, padding: '28px 24px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--danger)', letterSpacing: 3, marginBottom: 10 }}>IMPORTANT — TREASURY</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
                Treasury distribution is <strong style={{ color: 'var(--text)' }}>handled manually</strong>, not via smart contract. All distributions are announced publicly with on-chain transaction hashes so the community can verify.<br /><br />
                <span style={{ color: 'var(--warn)' }}>PUMPRACE is a community experiment. Never invest more than you can afford to lose. Token prices are driven by market forces only.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/nominate" className="btn btn-primary" style={{ fontSize: 13, padding: '14px 32px' }}>NOMINATE YOUR TOKEN →</Link>
        </div>
      </div>
    </>
  )
}
