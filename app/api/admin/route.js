import { NextResponse } from 'next/server'
import sql, { initDB } from '@/lib/db'
import { fetchTokenInfo } from '@/lib/dexscreener'

export async function POST(request) {
  try {
    await initDB()

    const { contractAddress, password, action } = await request.json()

    // Auth check
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Action: init first race
    if (action === 'init-race') {
      const existing = await sql`SELECT id FROM races WHERE status IN ('live', 'waiting')`
      if (existing.length > 0) {
        return NextResponse.json({ error: 'A race is already active' }, { status: 400 })
      }
      const race = await sql`INSERT INTO races (status) VALUES ('waiting') RETURNING *`
      return NextResponse.json({ success: true, race: race[0] })
    }

    // Action: add token to current race directly
    if (action === 'add-token') {
      if (!contractAddress) {
        return NextResponse.json({ error: 'Contract address required' }, { status: 400 })
      }

      const ca = contractAddress.trim()

      // Find or create token
      let token = await sql`SELECT * FROM tokens WHERE contract_address = ${ca}`

      if (token.length === 0) {
        const tokenInfo = await fetchTokenInfo(ca)
        if (!tokenInfo) {
          return NextResponse.json({ error: 'Could not fetch token from DexScreener' }, { status: 404 })
        }
        token = await sql`
          INSERT INTO tokens (contract_address, name, ticker, logo_url, current_mcap, status, votes)
          VALUES (${ca}, ${tokenInfo.name}, ${tokenInfo.ticker}, ${tokenInfo.logo_url}, ${tokenInfo.current_mcap}, 'queued', 50)
          RETURNING *
        `
      } else {
        await sql`UPDATE tokens SET status = 'queued' WHERE id = ${token[0].id}`
        token = await sql`SELECT * FROM tokens WHERE id = ${token[0].id}`
      }

      return NextResponse.json({ success: true, token: token[0] })
    }

    // Action: start race with all queued tokens
    if (action === 'start-race') {
      const race = await sql`SELECT * FROM races WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`
      if (race.length === 0) {
        return NextResponse.json({ error: 'No waiting race found. Init a race first.' }, { status: 400 })
      }

      const queued = await sql`SELECT * FROM tokens WHERE status = 'queued'`
      if (queued.length < 4) {
        return NextResponse.json({ error: `Need at least 4 queued tokens. Have ${queued.length}.` }, { status: 400 })
      }

      // Start race
      await sql`UPDATE races SET status = 'live', started_at = NOW() WHERE id = ${race[0].id}`

      // Add all queued tokens as race entries
      for (const token of queued) {
        const mcap = token.current_mcap || 0
        await sql`
          INSERT INTO race_entries (race_id, token_id, start_mcap, current_mcap, peak_mcap)
          VALUES (${race[0].id}, ${token.id}, ${mcap}, ${mcap}, ${mcap})
          ON CONFLICT (race_id, token_id) DO NOTHING
        `
        await sql`UPDATE tokens SET status = 'racing' WHERE id = ${token.id}`
      }

      return NextResponse.json({ success: true, message: `Race started with ${queued.length} tokens` })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin error:', err)
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('password')

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDB()

  const races = await sql`SELECT * FROM races ORDER BY id DESC LIMIT 5`
  const queuedTokens = await sql`SELECT * FROM tokens WHERE status = 'queued'`
  const pendingTokens = await sql`SELECT * FROM tokens WHERE status = 'pending' ORDER BY votes DESC`

  return NextResponse.json({ races, queuedTokens, pendingTokens })
}
