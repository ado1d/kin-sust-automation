import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// Simple hash function for passwords
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// GET - List all donors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Fetch donor by ID
      const donorResult = await query('SELECT * FROM "Donor" WHERE "id" = $1', [id])
      if (donorResult.rows.length === 0) {
        return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
      }
      const donor = donorResult.rows[0]

      // Fetch donations for this donor (latest 10) with event and items
      const donationsResult = await query(
        'SELECT * FROM "Donation" WHERE "donorId" = $1 ORDER BY "createdAt" DESC LIMIT 10',
        [id]
      )
      const donations = donationsResult.rows

      // Fetch donation count
      const countResult = await query(
        'SELECT COUNT(*)::int AS count FROM "Donation" WHERE "donorId" = $1',
        [id]
      )
      const donationCount = countResult.rows[0].count

      // Fetch related events and items for the donations
      const eventIds = donations.filter(d => d.eventId).map(d => d.eventId)
      const donationIds = donations.map(d => d.id)

      let eventsMap: Record<string, any> = {}
      let itemsMap: Record<string, any[]> = {}

      if (donationIds.length > 0) {
        const placeholders = donationIds.map((_, i) => `$${i + 1}`).join(', ')

        const [itemsResult, eventResult] = await Promise.all([
          query(`SELECT * FROM "DonationItem" WHERE "donationId" IN (${placeholders})`, donationIds),
          eventIds.length > 0
            ? query(`SELECT * FROM "Event" WHERE "id" = ANY($1)`, [eventIds])
            : Promise.resolve({ rows: [] })
        ])

        for (const e of eventResult.rows) {
          eventsMap[e.id] = e
        }
        for (const item of itemsResult.rows) {
          if (!itemsMap[item.donationId]) itemsMap[item.donationId] = []
          itemsMap[item.donationId].push(item)
        }
      }

      // Assemble: attach event and items to each donation
      for (const donation of donations) {
        donation.event = donation.eventId && eventsMap[donation.eventId] ? eventsMap[donation.eventId] : null
        donation.items = itemsMap[donation.id] || []
      }

      donor.donations = donations
      donor._count = { donations: donationCount }

      // Remove password from response
      delete donor.password

      return NextResponse.json({ donor })
    }

    // List all donors with donation count
    const donorsResult = await query(
      `SELECT d.*,
        (SELECT COUNT(*)::int FROM "Donation" WHERE "donorId" = d."id") AS "_count_donations"
       FROM "Donor" d
       ORDER BY d."createdAt" DESC`
    )

    const donors = donorsResult.rows.map(d => {
      const { _count_donations, ...rest } = d
      delete rest.password
      return { ...rest, _count: { donations: _count_donations } }
    })

    return NextResponse.json({ donors })
  } catch (error) {
    console.error('Get donors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new donor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password, address, notes } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for existing email
    const existingResult = await query('SELECT "id" FROM "Donor" WHERE "email" = $1', [email])
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const donorId = generateId()
    const donorResult = await query(
      `INSERT INTO "Donor" ("id", "name", "email", "phone", "password", "address", "notes", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        donorId,
        name,
        email,
        phone || null,
        simpleHash(password),
        address || null,
        notes || null,
        'Active',
      ]
    )

    const donor = donorResult.rows[0]
    // Remove password from response
    delete donor.password

    return NextResponse.json({ donor })
  } catch (error) {
    console.error('Create donor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update donor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing donor ID' }, { status: 400 })
    }

    // Verify current password if changing password
    if (data.password && data.currentPassword) {
      const passResult = await query('SELECT "password" FROM "Donor" WHERE "id" = $1', [id])
      if (passResult.rows.length === 0 || passResult.rows[0].password !== simpleHash(data.currentPassword)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    // Build SET clause dynamically
    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      setClauses.push(`"name" = $${paramIndex++}`)
      params.push(data.name)
    }
    if (data.phone !== undefined) {
      setClauses.push(`"phone" = $${paramIndex++}`)
      params.push(data.phone || null)
    }
    if (data.address !== undefined) {
      setClauses.push(`"address" = $${paramIndex++}`)
      params.push(data.address || null)
    }
    if (data.notes !== undefined) {
      setClauses.push(`"notes" = $${paramIndex++}`)
      params.push(data.notes || null)
    }
    if (data.status) {
      setClauses.push(`"status" = $${paramIndex++}`)
      params.push(data.status)
    }
    if (data.avatar !== undefined) {
      setClauses.push(`"avatar" = $${paramIndex++}`)
      params.push(data.avatar || null)
    }
    if (data.password) {
      setClauses.push(`"password" = $${paramIndex++}`)
      params.push(simpleHash(data.password))
    }

    if (setClauses.length === 0) {
      // Nothing to update, return current donor
      const currentResult = await query('SELECT * FROM "Donor" WHERE "id" = $1', [id])
      const donor = currentResult.rows[0]
      delete donor.password
      return NextResponse.json({ donor })
    }

    setClauses.push(`"updatedAt" = NOW()`)
    params.push(id) // for WHERE clause

    const donorResult = await query(
      `UPDATE "Donor" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`,
      params
    )

    const donor = donorResult.rows[0]
    // Remove password from response
    delete donor.password

    return NextResponse.json({ donor })
  } catch (error) {
    console.error('Update donor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete donor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing donor ID' }, { status: 400 })
    }

    await query('DELETE FROM "Donor" WHERE "id" = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete donor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
