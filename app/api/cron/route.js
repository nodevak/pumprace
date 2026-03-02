import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import sql, { initDB } from '../../../lib/db'
import { fetchMcap } from '../../../lib/dexscreener'

const RACE_DURATION_MS = 4 * 60 * 60 * 1000
const RUG_THRESHOLD = 0.05
const MIN_TOKENS = 10

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await initDB()

    const liveRaces = await sql`SELECT * FROM races WHERE status = 'live' ORDER BY id DESC LIMIT 1`

    if (liveRaces.length > 0) {
      const race = liveRaces[0]
      const elapsed = Date.now() - new Date(race.started_at).getTime()

      const entries = await sql`
        SELECT re.*, t.contract_address FROM race_entries re
        JOIN tokens t ON t.id = re.token_id
        WHERE re.race_id = ${race.id} AND re.is_rugged = FALSE
      `

      for (const entry of entries) {
        const mcap = await fetchMcap(entry.contract_address)
        if (mcap === null) continue

        const startMcap = Number(entry.start_mcap)
        const isRugged = startMcap > 0 && mcap < startMcap * RUG_THRESHOLD
        const peakMcap = Math.max(Number(entry.peak_mcap), mcap)

        await sql`
          UPDATE race_entries SET current_mcap = ${mcap}, peak_mcap = ${peakMcap}, is_rugged = ${isRugged}
          WHERE id = ${entry.id}
        `
        await sql`INSERT INTO mcap_snapshots (race_entry_id, mcap) VALUES (${entry.id}, ${mcap})`
        await sql`UPDATE tokens SET current_mcap = ${mcap} WHERE id = ${entry.token_id}`
        if (isRugged) await sql`UPDATE tokens SET status = 'rugged' WHERE id = ${entry.token_id}`
      }

      if (elapsed >= RACE_DURATION_MS) {
        await endRace(race.id)
      }

    } else {
      await checkAndStartRace()
    }

    return NextResponse.json({ success: true, time: new Date().toISOString() })
  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function endRace(raceId) {
  const entries = await sql`
    SELECT * FROM race_entries WHERE race_id = ${raceId} AND is_rugged = FALSE ORDER BY current_mcap DESC
  `
  for (let i = 0; i < entries.length; i++) {
    await sql`UPDATE race_entries SET final_rank = ${i + 1} WHERE id = ${entries[i].id}`
    await sql`UPDATE tokens SET status = 'finished' WHERE id = ${entries[i].token_id}`
  }
  const rugged = await sql`SELECT * FROM race_entries WHERE race_id = ${raceId} AND is_rugged = TRUE`
  for (let i = 0; i < rugged.length; i++) {
    await sql`UPDATE race_entries SET final_rank = ${entries.length + i + 1} WHERE id = ${rugged[i].id}`
  }
  const winner = entries.length > 0 ? entries[0].token_id : null
  await sql`UPDATE races SET status = 'ended', ended_at = NOW(), winner_token_id = ${winner} WHERE id = ${raceId}`
  // Auto-create next waiting race
  await sql`INSERT INTO races (status) VALUES ('waiting')`
}

async function checkAndStartRace() {
  let waiting = await sql`SELECT * FROM races WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`
  if (waiting.length === 0) {
    await sql`INSERT INTO races (status) VALUES ('waiting')`
    waiting = await sql`SELECT * FROM races WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`
  }

  const queued = await sql`SELECT * FROM tokens WHERE status = 'queued' ORDER BY votes DESC`
  if (queued.length < MIN_TOKENS) return

  const race = waiting[0]
  await sql`UPDATE races SET status = 'live', started_at = NOW() WHERE id = ${race.id}`

  const top = queued.slice(0, MIN_TOKENS)
  for (const token of top) {
    const mcap = Number(token.current_mcap) || 0
    await sql`
      INSERT INTO race_entries (race_id, token_id, start_mcap, current_mcap, peak_mcap)
      VALUES (${race.id}, ${token.id}, ${mcap}, ${mcap}, ${mcap})
      ON CONFLICT (race_id, token_id) DO NOTHING
    `
    await sql`UPDATE tokens SET status = 'racing' WHERE id = ${token.id}`
  }
}
