/**
 * PUMPRACE Cron Worker
 * 
 * This file runs as a separate Railway service.
 * It calls the /api/cron endpoint every 30 seconds to power the race engine.
 * 
 * In Railway: deploy this as a second service with start command: node cron.js
 */

const SITE_URL = process.env.SITE_URL // e.g. https://pumprace.up.railway.app
const CRON_SECRET = process.env.CRON_SECRET
const INTERVAL_MS = 30 * 1000 // 30 seconds

if (!SITE_URL) {
  console.error('❌ SITE_URL environment variable is not set')
  process.exit(1)
}

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is not set')
  process.exit(1)
}

async function tick() {
  const start = Date.now()
  try {
    const res = await fetch(`${SITE_URL}/api/cron`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()
    const elapsed = Date.now() - start

    if (res.ok) {
      console.log(`✅ [${new Date().toISOString()}] Cron tick OK (${elapsed}ms)`)
    } else {
      console.error(`⚠️  [${new Date().toISOString()}] Cron tick failed: ${data.error} (${elapsed}ms)`)
    }
  } catch (err) {
    const elapsed = Date.now() - start
    console.error(`❌ [${new Date().toISOString()}] Cron fetch error (${elapsed}ms):`, err.message)
  }
}

// Run immediately on start
tick()

// Then run every 30 seconds
setInterval(tick, INTERVAL_MS)

console.log(`🏁 PUMPRACE cron worker started`)
console.log(`   Target: ${SITE_URL}/api/cron`)
console.log(`   Interval: every ${INTERVAL_MS / 1000}s`)
