const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens'

export async function fetchTokenInfo(contractAddress) {
  try {
    const res = await fetch(`${DEXSCREENER_API}/${contractAddress}`, {
      next: { revalidate: 0 }
    })

    if (!res.ok) return null

    const data = await res.json()

    if (!data.pairs || data.pairs.length === 0) return null

    // Get the most liquid Solana pair
    const solanaPairs = data.pairs.filter(p => p.chainId === 'solana')
    if (solanaPairs.length === 0) return null

    const pair = solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]

    const mcap = pair.marketCap || pair.fdv || 0
    const name = pair.baseToken?.name || 'Unknown'
    const ticker = pair.baseToken?.symbol || '???'
    const logo = pair.info?.imageUrl || null

    return {
      name,
      ticker,
      logo_url: logo,
      current_mcap: mcap,
      pair_url: pair.url || null
    }
  } catch (err) {
    console.error('DexScreener fetch error:', err)
    return null
  }
}

export async function fetchMcap(contractAddress) {
  try {
    const res = await fetch(`${DEXSCREENER_API}/${contractAddress}`, {
      next: { revalidate: 0 }
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.pairs || data.pairs.length === 0) return null

    const solanaPairs = data.pairs.filter(p => p.chainId === 'solana')
    if (solanaPairs.length === 0) return null

    const pair = solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]

    return pair.marketCap || pair.fdv || 0
  } catch (err) {
    console.error('DexScreener mcap fetch error:', err)
    return null
  }
}
