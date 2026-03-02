const BASE = 'https://api.dexscreener.com/latest/dex/tokens'

function getBestPair(data) {
  if (!data.pairs || data.pairs.length === 0) return null
  const solana = data.pairs.filter(p => p.chainId === 'solana')
  if (solana.length === 0) return null
  return solana.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
}

export async function fetchTokenInfo(ca) {
  try {
    const res = await fetch(`${BASE}/${ca}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const pair = getBestPair(data)
    if (!pair) return null
    return {
      name: pair.baseToken?.name || 'Unknown',
      ticker: pair.baseToken?.symbol || '???',
      logo_url: pair.info?.imageUrl || null,
      current_mcap: pair.marketCap || pair.fdv || 0
    }
  } catch (err) {
    console.error('fetchTokenInfo error:', err)
    return null
  }
}

export async function fetchMcap(ca) {
  try {
    const res = await fetch(`${BASE}/${ca}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const pair = getBestPair(data)
    if (!pair) return null
    return pair.marketCap || pair.fdv || 0
  } catch (err) {
    console.error('fetchMcap error:', err)
    return null
  }
}
