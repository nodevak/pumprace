import { NextResponse } from 'next/server'
import sql, { initDB } from '../../../lib/db'

const VOTES_TO_QUALIFY = 50

export async function POST(request) {
  try {
    await initDB()
    const { tokenId } = await request.json()
    if (!tokenId) return NextResponse.json({ error: 'Token ID required' }, { status: 400 })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    const token = await sql`SELECT * FROM tokens WHERE id = ${tokenId}`
    if (token.length === 0) return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    if (token[0].status !== 'pending') return NextResponse.json({ error: 'Token is already queued or racing' }, { status: 400 })

    // 1 vote per IP per token
    const already = await sql`SELECT id FROM votes WHERE token_id = ${tokenId} AND voter_ip = ${ip}`
    if (already.length > 0) return NextResponse.json({ error: 'You already voted for this token' }, { status: 409 })

    await sql`INSERT INTO votes (token_id, voter_ip) VALUES (${tokenId}, ${ip})`
    const updated = await sql`UPDATE tokens SET votes = votes + 1 WHERE id = ${tokenId} RETURNING votes`
    const newVotes = updated[0].votes

    if (newVotes >= VOTES_TO_QUALIFY) {
      await sql`UPDATE tokens SET status = 'queued' WHERE id = ${tokenId}`
    }

    return NextResponse.json({ success: true, votes: newVotes, qualified: newVotes >= VOTES_TO_QUALIFY })
  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
