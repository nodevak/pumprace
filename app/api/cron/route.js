import { NextResponse } from 'next/server'
import sql, { initDB } from '@/lib/db'
import { fetchMcap } from '@/lib/dexscreener'

const RACE_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours
const RUG_THRESHOLD = 0.05 // 95% drop = rugged
const MIN_TOKENS_TO_START = 10

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await initDB()

    // Get current live race
    const liveRaces = await sql`SELECT * FROM races WHERE status = 'live' ORDER BY id DESC LIMIT 1`

    if (liveRaces.length > 0) {
      const race = liveRaces[0]
      const elapsed = Date.now() - new Date(race.started_at).getTime()

      // Get all active (non-rugged) entries
      const entries = await sql`
        SELECT re.*, t.contract_address
        FROM race_entries re
        JOIN tokens t ON t.id = re.token_id
        WHERE re.race_id = ${race.id} AND re.is_rugged = FALSE
      `

      // Fetch current mcap for each token
      for (const entry of entries) {
        const mcap = await fetchMcap(entry.contract_address)
        if (mcap === null) continue

        const startMcap = Number(entry.start_mcap)
        const isRugged = startMcap > 0 && mcap < startMcap * RUG_THRESHOLD
        const peakMcap = Math.max(Number(entry.peak_mcap), mcap)

        // Update entry
        await sql`
          UPDATE race_entries
          SET current_mcap = ${mcap}, peak_mcap = ${peakMcap}, is_rugged = ${isRugged}
          WHERE id = ${entry.id}
        `

        // Save snapshot
        await sql`
          INSERT INTO mcap_snapshots (race_entry_id, mcap) VALUES (${entry.id}, ${mcap})
        `

        // Update token current mcap
        await sql`UPDATE tokens SET current_mcap = ${mcap} WHERE id = ${entry.token_id}`

        if (isRugged) {
          await sql`UPDATE tokens SET status = 'rugged' WHERE id = ${entry.token_id}`
        }
      }

      // Check if race should end
      if (elapsed >= RACE_DURATION_MS) {
        await endRace(race.id)
      }

    } else {
      // No live race — check if we should start one
      await checkAndStartRace()
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function endRace(raceId) {
  // Get all non-rugged entries sorted by final mcap
  const entries = await sql`
    SELECT * FROM race_entries
    WHERE race_id = ${raceId} AND is_rugged = FALSE
    ORDER BY current_mcap DESC
  `

  // Assign ranks
  for (let i = 0; i < entries.length; i++) {
    await sql`UPDATE race_entries SET final_rank = ${i + 1} WHERE id = ${entries[i].id}`
    await sql`UPDATE tokens SET status = 'finished' WHERE id = ${entries[i].token_id}`
  }

  // Also rank rugged tokens at the bottom
  const ruggedEntries = await sql`
    SELECT * FROM race_entries WHERE race_id = ${raceId} AND is_rugged = TRUE
  `
  for (let i = 0; i < ruggedEntries.length; i++) {
    const rank = entries.length + i + 1
    await sql`UPDATE race_entries SET final_rank = ${rank} WHERE id = ${ruggedEntries[i].id}`
  }

  // Set winner
  const winnerId = entries.length > 0 ? entries[0].token_id : null

  await sql`
    UPDATE races
    SET status = 'ended', ended_at = NOW(), winner_token_id = ${winnerId}
    WHERE id = ${raceId}
  `

  // Create new waiting race for next round
  await sql`INSERT INTO races (status) VALUES ('waiting')`
}

async function checkAndStartRace() {
  const waitingRace = await sql`SELECT * FROM races WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`

  if (waitingRace.length === 0) {
    // Create initial waiting race
    await sql`INSERT INTO races (status) VALUES ('waiting')`
    return
  }

  // Count queued tokens
  const queued = await sql`SELECT * FROM tokens WHERE status = 'queued'`

  if (queued.length >= MIN_TOKENS_TO_START) {
    const race = waitingRace[0]

    // Start the race
    await sql`UPDATE races SET status = 'live', started_at = NOW() WHERE id = ${race.id}`

    // Add top 10 queued tokens (by votes)
    const top10 = queued.sort((a, b) => b.votes - a.votes).slice(0, MIN_TOKENS_TO_START)

    for (const token of top10) {
      const mcap = token.current_mcap || 0
      await sql`
        INSERT INTO race_entries (race_id, token_id, start_mcap, current_mcap, peak_mcap)
        VALUES (${race.id}, ${token.id}, ${mcap}, ${mcap}, ${mcap})
        ON CONFLICT (race_id, token_id) DO NOTHING
      `
      await sql`UPDATE tokens SET status = 'racing' WHERE id = ${token.id}`
    }
  }
}
