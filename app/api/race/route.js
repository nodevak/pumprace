import { NextResponse } from 'next/server'
import sql, { initDB } from '../../../lib/db'

export async function GET() {
  try {
    await initDB()

    const races = await sql`SELECT * FROM races WHERE status IN ('live','waiting') ORDER BY id DESC LIMIT 1`
    if (races.length === 0) return NextResponse.json({ race: null, entries: [], snapshots: {} })

    const race = races[0]

    const entries = await sql`
      SELECT re.id as entry_id, re.race_id, re.token_id,
        re.start_mcap, re.current_mcap, re.peak_mcap, re.is_rugged, re.final_rank,
        t.name, t.ticker, t.logo_url, t.contract_address
      FROM race_entries re
      JOIN tokens t ON t.id = re.token_id
      WHERE re.race_id = ${race.id}
      ORDER BY re.current_mcap DESC
    `

    const snapshots = {}
    for (const entry of entries) {
      const snaps = await sql`
        SELECT mcap, recorded_at FROM mcap_snapshots
        WHERE race_entry_id = ${entry.entry_id}
        ORDER BY recorded_at ASC LIMIT 60
      `
      snapshots[entry.token_id] = snaps
    }

    let timeLeftSeconds = null
    if (race.status === 'live' && race.started_at) {
      const elapsed = (Date.now() - new Date(race.started_at).getTime()) / 1000
      timeLeftSeconds = Math.max(0, 4 * 60 * 60 - elapsed)
    }

    return NextResponse.json({ race, entries, snapshots, timeLeftSeconds })
  } catch (err) {
    console.error('Race GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
