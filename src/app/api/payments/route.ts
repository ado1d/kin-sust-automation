import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { enrichPayments } from '@/lib/helpers'

// GET - List payments (with optional donation filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const donationId = searchParams.get('donationId')
    const donorId = searchParams.get('donorId')

    // Build dynamic WHERE clause
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (donationId) {
      conditions.push(`"donationId" = $${paramIdx++}`)
      params.push(donationId)
    }
    if (donorId) {
      conditions.push(`"donorId" = $${paramIdx++}`)
      params.push(donorId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT "id", "donationId", "donorId", "method", "amount", "transactionId", "status", "proofPath", "createdAt"
       FROM "Payment" ${whereClause}
       ORDER BY "createdAt" DESC`,
      params,
    )

    const payments = await enrichPayments(result.rows)
    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
