'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const path = usePathname()

  return (
    <nav>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          PUMP<span>RACE</span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/" className={path === '/' ? 'active' : ''}>◈ Live Race</Link></li>
          <li><Link href="/nominate" className={path === '/nominate' ? 'active' : ''}>+ Nominate</Link></li>
          <li><Link href="/hall-of-fame" className={path === '/hall-of-fame' ? 'active' : ''}>🏆 Hall of Fame</Link></li>
          <li><Link href="/how-it-works" className={path === '/how-it-works' ? 'active' : ''}>? How It Works</Link></li>
          <li>
            <Link href="/nominate" className="btn nav-cta">Join Race →</Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
