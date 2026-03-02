import { NextResponse } from 'next/server'
import sql, { initDB } from '../../../lib/db'
import { fetchTokenInfo } from '../../../lib/dexscreener'

export async function POST(request) {
  try {
    await initDB()
    const { contractAddress } = await request.json()

    if (!contractAddress || contractAddress.trim().length < 32) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 })
    }

    const ca = contractAddress.trim()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    // 1 nomination per IP per hour
    const recent = await sql`
      SELECT id FROM tokens WHERE submitted_by_ip = ${ip}
      AND created_at > NOW() - INTERVAL '1 hour'
    `
    if (recent.length > 0) {
      return NextResponse.json({ error: 'You can only nominate 1 token per hour.' }, { status: 429 })
    }

    // Already nominated?
    const existing = await sql`SELECT id, status FROM tokens WHERE contract_address = ${ca}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'This token has already been nominated.' }, { status: 409 })
    }

    // Fetch from DexScreener
    const info = await fetchTokenInfo(ca)
    if (!info) {
      return NextResponse.json({ error: 'Token not found on Solana DexScreener.' }, { status: 404 })
    }
    if (info.current_mcap < 1000) {
      return NextResponse.json({ error: 'Token market cap is too low.' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO tokens (contract_address, name, ticker, logo_url, current_mcap, status, submitted_by_ip)
      VALUES (${ca}, ${info.name}, ${info.ticker}, ${info.logo_url}, ${info.current_mcap}, 'pending', ${ip})
      RETURNING *
    `
    return NextResponse.json({ success: true, token: result[0] })
  } catch (err) {
    console.error('Nominate POST error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await initDB()
    const tokens = await sql`
      SELECT id, name, ticker, logo_url, current_mcap, votes, status, created_at
      FROM tokens
      WHERE status IN ('pending', 'queued')
      ORDER BY votes DESC, created_at DESC
    `
    return NextResponse.json({ tokens })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
