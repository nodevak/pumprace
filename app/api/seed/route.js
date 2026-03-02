import { NextResponse } from 'next/server'
import sql, { initDB } from '../../../lib/db'
import { fetchTokenInfo } from '../../../lib/dexscreener'

// This route lets you seed the first race without an admin panel.
// Call it with: GET /api/seed?secret=YOUR_SEED_SECRET&action=init
// Or add tokens: GET /api/seed?secret=YOUR_SEED_SECRET&action=add&ca=CONTRACT_ADDRESS
// Or start race: GET /api/seed?secret=YOUR_SEED_SECRET&action=start

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const action = searchParams.get('action')
  const ca = searchParams.get('ca')

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDB()

  // ACTION: init — create the first waiting race
  if (action === 'init') {
    const existing = await sql`SELECT id FROM races WHERE status IN ('live','waiting')`
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Race already exists', race: existing[0] })
    }
    const race = await sql`INSERT INTO races (status) VALUES ('waiting') RETURNING *`
    return NextResponse.json({ success: true, message: 'Race slot created', race: race[0] })
  }

  // ACTION: add — add a token to the queue by contract address
  if (action === 'add') {
    if (!ca) return NextResponse.json({ error: 'ca param required' }, { status: 400 })

    let token = await sql`SELECT * FROM tokens WHERE contract_address = ${ca}`
    if (token.length === 0) {
      const info = await fetchTokenInfo(ca)
      if (!info) return NextResponse.json({ error: 'Token not found on DexScreener' }, { status: 404 })
      token = await sql`
        INSERT INTO tokens (contract_address, name, ticker, logo_url, current_mcap, status, votes)
        VALUES (${ca}, ${info.name}, ${info.ticker}, ${info.logo_url}, ${info.current_mcap}, 'queued', 50)
        RETURNING *
      `
    } else {
      await sql`UPDATE tokens SET status = 'queued', votes = 50 WHERE id = ${token[0].id}`
      token = await sql`SELECT * FROM tokens WHERE id = ${token[0].id}`
    }
    const count = await sql`SELECT COUNT(*) FROM tokens WHERE status = 'queued'`
    return NextResponse.json({ success: true, token: token[0], queued: count[0].count })
  }

  // ACTION: start — start the race with all queued tokens
  if (action === 'start') {
    const race = await sql`SELECT * FROM races WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`
    if (race.length === 0) return NextResponse.json({ error: 'No waiting race. Call ?action=init first.' }, { status: 400 })

    const queued = await sql`SELECT * FROM tokens WHERE status = 'queued'`
    if (queued.length < 4) return NextResponse.json({ error: `Need at least 4 tokens. Have ${queued.length}.` }, { status: 400 })

    await sql`UPDATE races SET status = 'live', started_at = NOW() WHERE id = ${race[0].id}`

    for (const token of queued) {
      const mcap = Number(token.current_mcap) || 0
      await sql`
        INSERT INTO race_entries (race_id, token_id, start_mcap, current_mcap, peak_mcap)
        VALUES (${race[0].id}, ${token.id}, ${mcap}, ${mcap}, ${mcap})
        ON CONFLICT (race_id, token_id) DO NOTHING
      `
      await sql`UPDATE tokens SET status = 'racing' WHERE id = ${token.id}`
    }

    return NextResponse.json({ success: true, message: `Race started with ${queued.length} tokens!` })
  }

  // ACTION: status — check current state
  if (action === 'status') {
    const races = await sql`SELECT * FROM races ORDER BY id DESC LIMIT 3`
    const queued = await sql`SELECT id, name, ticker, current_mcap FROM tokens WHERE status = 'queued'`
    const racing = await sql`SELECT id, name, ticker, current_mcap FROM tokens WHERE status = 'racing'`
    return NextResponse.json({ races, queued, racing })
  }

  return NextResponse.json({ 
    error: 'Unknown action',
    usage: {
      init: '/api/seed?secret=YOUR_SECRET&action=init',
      add: '/api/seed?secret=YOUR_SECRET&action=add&ca=CONTRACT_ADDRESS',
      start: '/api/seed?secret=YOUR_SECRET&action=start',
      status: '/api/seed?secret=YOUR_SECRET&action=status'
    }
  }, { status: 400 })
}
