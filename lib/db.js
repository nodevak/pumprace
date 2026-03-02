import { neon } from '@neondatabase/serverless'

export function getDb() {
  return neon(process.env.DATABASE_URL)
}

export async function initDB() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS tokens (
      id SERIAL PRIMARY KEY,
      contract_address TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      logo_url TEXT,
      current_mcap NUMERIC DEFAULT 0,
      votes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      submitted_by_ip TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS races (
      id SERIAL PRIMARY KEY,
      status TEXT DEFAULT 'waiting',
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      winner_token_id INTEGER REFERENCES tokens(id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS race_entries (
      id SERIAL PRIMARY KEY,
      race_id INTEGER REFERENCES races(id),
      token_id INTEGER REFERENCES tokens(id),
      start_mcap NUMERIC DEFAULT 0,
      current_mcap NUMERIC DEFAULT 0,
      peak_mcap NUMERIC DEFAULT 0,
      is_rugged BOOLEAN DEFAULT FALSE,
      final_rank INTEGER,
      UNIQUE(race_id, token_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS mcap_snapshots (
      id SERIAL PRIMARY KEY,
      race_entry_id INTEGER REFERENCES race_entries(id),
      mcap NUMERIC NOT NULL,
      recorded_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      token_id INTEGER REFERENCES tokens(id),
      voter_ip TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(token_id, voter_ip)
    )
  `
  return sql
}
