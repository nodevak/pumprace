import { Orbitron, Space_Mono } from 'next/font/google'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900']
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700']
})

export const metadata = {
  title: 'PUMP RACE — Solana MCAP Battle Arena',
  description: 'The ultimate Solana token race. Nominate your token, earn votes, and race to the highest market cap. Winner takes the treasury.',
  openGraph: {
    title: 'PUMP RACE',
    description: 'Solana MCAP Battle Arena. Race to the top.',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
