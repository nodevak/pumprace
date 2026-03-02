const SITE_URL = process.env.SITE_URL
const CRON_SECRET = process.env.CRON_SECRET
const INTERVAL_MS = 30 * 1000

if (!SITE_URL || !CRON_SECRET) {
  console.error('❌ Missing SITE_URL or CRON_SECRET')
  process.exit(1)
}

async function tick() {
  try {
    const res = await fetch(`${SITE_URL}/api/cron`, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    })
    const data = await res.json()
    console.log(`✅ [${new Date().toISOString()}]`, res.ok ? 'OK' : data.error)
  } catch (err) {
    console.error(`❌ [${new Date().toISOString()}]`, err.message)
  }
}

tick()
setInterval(tick, INTERVAL_MS)
console.log(`🏁 Cron worker running → ${SITE_URL}/api/cron every ${INTERVAL_MS/1000}s`)
