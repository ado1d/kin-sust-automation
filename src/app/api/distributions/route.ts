import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/distributions - Get all distribution history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const donationType = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build WHERE conditions for distributions
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (eventId) {
      if (eventId === 'none') {
        conditions.push(`dd."eventId" IS NULL`)
      } else {
        conditions.push(`dd."eventId" = $${paramIdx++}`)
        params.push(eventId)
      }
    }
    if (donationType) {
      conditions.push(`d."type" = $${paramIdx++}`)
      params.push(donationType)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Fetch paginated distributions with joined donation+donor and event
    const distributionsResult = await query(
      `SELECT
        dd.*,
        json_build_object(
          'id', d.id,
          'type', d.type,
          'amount', d.amount,
          'donor', json_build_object(
            'id', dn.id,
            'name', dn.name,
            'email', dn.email,
            'phone', dn.phone
          )
        ) AS donation,
        CASE WHEN e.id IS NOT NULL THEN
          json_build_object('id', e.id, 'name', e.name)
        ELSE NULL END AS event
      FROM "DonationDistribution" dd
      LEFT JOIN "Donation" d ON dd."donationId" = d.id
      LEFT JOIN "Donor" dn ON d."donorId" = dn.id
      LEFT JOIN "Event" e ON dd."eventId" = e.id
      ${whereClause}
      ORDER BY dd."createdAt" DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    )

    // Count total
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM "DonationDistribution" dd
       LEFT JOIN "Donation" d ON dd."donationId" = d.id
       ${whereClause}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    // Get events that have distributions (distinct)
    const eventsResult = await query(
      `SELECT DISTINCT ON (dd."eventId") dd."eventId",
        json_build_object('id', e.id, 'name', e.name) AS event
       FROM "DonationDistribution" dd
       LEFT JOIN "Event" e ON dd."eventId" = e.id
       WHERE dd."eventId" IS NOT NULL`
    )
    const events = eventsResult.rows
      .filter(r => r.event)
      .map(r => ({ id: r.event.id, name: r.event.name }))

    // Summary stats — sum amounts by donation type
    const summaryResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN d."type" = 'monetary' THEN dd.amount ELSE 0 END), 0) AS "totalMonetaryDistributed",
        COALESCE(SUM(CASE WHEN d."type" = 'in-kind' THEN dd.quantity ELSE 0 END), 0) AS "totalItemsDistributed"
       FROM "DonationDistribution" dd
       LEFT JOIN "Donation" d ON dd."donationId" = d.id
       ${whereClause}`,
      params
    )

    const summaryRow = summaryResult.rows[0]

    return NextResponse.json({
      distributions: distributionsResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      events,
      summary: {
        totalMonetaryDistributed: Number(summaryRow?.totalMonetaryDistributed ?? 0),
        totalItemsDistributed: Number(summaryRow?.totalItemsDistributed ?? 0),
        totalDistributions: total
      }
    })
  } catch (error) {
    console.error('Get distribution history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
