import { Pool, PoolConfig } from 'pg'

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
}

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined
}

export const pool = globalForPg.pool ?? new Pool(poolConfig)

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool

// Helper to generate CUID-like IDs (compatible with the existing data)
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  const randomPart2 = Math.random().toString(36).substring(2, 10)
  return `c${timestamp}${randomPart}${randomPart2}`.substring(0, 25)
}

// Query helper with better error handling
export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount })
    }
    return res
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 100), error })
    throw error
  }
}

// Transaction helper
export async function transaction<T>(callback: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
