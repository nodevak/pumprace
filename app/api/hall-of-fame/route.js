import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { initDB } from '../../../lib/db'

export async function GET() {
  try {
    const sql = await initDB()
    const winners = await sql`
      SELECT r.id as race_id, r.started_at, r.ended_at,
        t.name, t.ticker, t.logo_url, t.contract_address,
        re.start_mcap, re.current_mcap as final_mcap, re.peak_mcap
      FROM races r
      JOIN tokens t ON t.id = r.winner_token_id
      JOIN race_entries re ON re.race_id = r.id AND re.token_id = r.winner_token_id
      WHERE r.status = 'ended' AND r.winner_token_id IS NOT NULL
      ORDER BY r.ended_at DESC LIMIT 50
    `
    return NextResponse.json({ winners })
  } catch (err) {
    console.error('Hall of fame error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
