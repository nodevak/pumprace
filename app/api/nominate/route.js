import { NextResponse } from 'next/server'
import sql, { initDB } from '@/lib/db'
import { fetchTokenInfo } from '@/lib/dexscreener'

export async function POST(request) {
  try {
    await initDB()

    const { contractAddress, turnstileToken } = await request.json()

    if (!contractAddress || contractAddress.trim().length < 32) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 })
    }

    const ca = contractAddress.trim()

    // Verify Turnstile captcha
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken
      })
    })
    const turnstileData = await turnstileRes.json()
    if (!turnstileData.success) {
      return NextResponse.json({ error: 'Captcha failed. Please try again.' }, { status: 400 })
    }

    // Get IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    // Check if already exists
    const existing = await sql`SELECT id, status FROM tokens WHERE contract_address = ${ca}`
    if (existing.length > 0) {
      return NextResponse.json({
        error: 'This token has already been nominated.',
        token: existing[0]
      }, { status: 409 })
    }

    // Fetch token info from DexScreener
    const tokenInfo = await fetchTokenInfo(ca)
    if (!tokenInfo) {
      return NextResponse.json({
        error: 'Could not find this token on Solana. Make sure it has a DexScreener listing.'
      }, { status: 404 })
    }

    if (tokenInfo.current_mcap < 1000) {
      return NextResponse.json({
        error: 'Token market cap is too low to be nominated.'
      }, { status: 400 })
    }

    // Insert token
    const result = await sql`
      INSERT INTO tokens (contract_address, name, ticker, logo_url, current_mcap, status, submitted_by_ip)
      VALUES (${ca}, ${tokenInfo.name}, ${tokenInfo.ticker}, ${tokenInfo.logo_url}, ${tokenInfo.current_mcap}, 'pending', ${ip})
      RETURNING *
    `

    return NextResponse.json({ success: true, token: result[0] })
  } catch (err) {
    console.error('Nominate error:', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
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
