#!/usr/bin/env node

/**
 * Database Migration Script for Supabase
 * 
 * Run with: node scripts/migrate.js
 * 
 * Uses DIRECT_URL for migrations (if set), otherwise falls back to DATABASE_URL.
 * Supabase recommends using the direct connection for DDL operations (migrations),
 * and the pooler connection for app queries.
 * 
 * Find your direct URL in:
 *   Supabase Dashboard → Settings → Database → Connection string → URI
 *   (it looks like: postgresql://postgres:[PASSWORD]@db.xxx.supabase.com:5432/postgres)
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function migrate() {
  // Prefer DIRECT_URL for migrations (no pooler), fall back to DATABASE_URL
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL (or DIRECT_URL) environment variable is not set.')
    console.error('')
    console.error('For Supabase, set in .env.local:')
    console.error('  DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres')
    console.error('  DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.com:5432/postgres')
    process.exit(1)
  }

  const isSupabase = databaseUrl.includes('supabase')
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
    max: 5,
  })

  try {
    console.log('Connecting to PostgreSQL database...')
    if (isSupabase) console.log('  (Supabase detected — using SSL)')
    console.log(`  Host: ${new URL(databaseUrl).hostname}`)
    
    const client = await pool.connect()
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "executedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )
    `)

    // Get already executed migrations
    const { rows: executed } = await client.query('SELECT "name" FROM "_migrations"')
    const executedNames = new Set(executed.map(r => r.name))

    // Read migration files
    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (files.length === 0) {
      console.log('No migration files found.')
      client.release()
      return
    }

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`  ✓ Already applied: ${file}`)
        continue
      }

      console.log(`  → Applying migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO "_migrations" ("name") VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`  ✓ Successfully applied: ${file}`)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`  ✗ Failed to apply: ${file}`)
        console.error(error)
        process.exit(1)
      }
    }

    client.release()
    console.log('\n✅ All migrations completed successfully!')
    console.log('\nYou can now start the app with: bun run dev')
  } catch (error) {
    console.error('\n❌ Migration failed:')
    if (error.code === 'ENOTFOUND') {
      console.error('  Cannot reach the database host. Check your connection string.')
    } else if (error.code === '28P01') {
      console.error('  Authentication failed. Check your username and password.')
    } else if (error.code === '3D000') {
      console.error('  Database does not exist. Check your database name.')
    } else {
      console.error(' ', error.message || error)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
