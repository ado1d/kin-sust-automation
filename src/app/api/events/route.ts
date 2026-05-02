import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// GET - List all events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      // Fetch event by ID
      const eventResult = await query('SELECT * FROM "Event" WHERE "id" = $1', [id])
      if (eventResult.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      const event = eventResult.rows[0]

      // Fetch donations for this event with donor and items
      const donationsResult = await query(
        'SELECT * FROM "Donation" WHERE "eventId" = $1 ORDER BY "createdAt" DESC',
        [id]
      )
      const donations = donationsResult.rows

      // Fetch donation count
      const countResult = await query(
        'SELECT COUNT(*)::int AS count FROM "Donation" WHERE "eventId" = $1',
        [id]
      )
      const donationCount = countResult.rows[0].count

      // Fetch related donors and items for the donations
      const donorIds = donations.filter(d => d.donorId).map(d => d.donorId)
      const donationIds = donations.map(d => d.id)

      let donorsMap: Record<string, any> = {}
      let itemsMap: Record<string, any[]> = {}

      if (donationIds.length > 0) {
        const placeholders = donationIds.map((_, i) => `$${i + 1}`).join(', ')

        const [donorsResult, itemsResult] = await Promise.all([
          donorIds.length > 0
            ? query('SELECT * FROM "Donor" WHERE "id" = ANY($1)', [donorIds])
            : Promise.resolve({ rows: [] }),
          query(`SELECT * FROM "DonationItem" WHERE "donationId" IN (${placeholders})`, donationIds)
        ])

        for (const dn of donorsResult.rows) {
          donorsMap[dn.id] = dn
        }
        for (const item of itemsResult.rows) {
          if (!itemsMap[item.donationId]) itemsMap[item.donationId] = []
          itemsMap[item.donationId].push(item)
        }
      }

      // Assemble: attach donor and items to each donation
      for (const donation of donations) {
        donation.donor = donation.donorId && donorsMap[donation.donorId] ? donorsMap[donation.donorId] : null
        donation.items = itemsMap[donation.id] || []
      }

      event.donations = donations
      event._count = { donations: donationCount }

      return NextResponse.json({ event })
    }

    // List all events with donation count
    const eventsResult = await query(
      `SELECT e.*,
        (SELECT COUNT(*)::int FROM "Donation" WHERE "eventId" = e."id") AS "_count_donations"
       FROM "Event" e
       WHERE ($1::text IS NULL OR e."status" = $1)
       ORDER BY e."startDate" DESC`,
      [status]
    )

    const events = eventsResult.rows.map(e => {
      const { _count_donations, ...rest } = e
      return { ...rest, _count: { donations: _count_donations } }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, needs, startDate, endDate, location, status, image } = body

    if (!name || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create event and notifications in a transaction
    const event = await transaction(async (client) => {
      const eventId = generateId()
      const eventResult = await client.query(
        `INSERT INTO "Event" ("id", "name", "description", "needs", "startDate", "endDate", "location", "status", "image", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          eventId,
          name,
          description || null,
          needs ? JSON.stringify(needs) : null,
          startDate,
          endDate || null,
          location || null,
          status || 'Published',
          image || null,
        ]
      )
      const newEvent = eventResult.rows[0]

      // Notify all active volunteers about new event
      if (status === 'Published' || !status) {
        const activeVolunteersResult = await client.query(
          'SELECT "id" FROM "Volunteer" WHERE "status" = $1',
          ['Active']
        )
        const activeVolunteers = activeVolunteersResult.rows

        if (activeVolunteers.length > 0) {
          const notifTitle = 'New Event: ' + name
          const notifMessage = `A new donation event "${name}" has been created${location ? ` at ${location}` : ''}. Check it out!`

          // Build bulk INSERT for notifications
          const notifParams: unknown[] = []
          const placeholders: string[] = []
          let pi = 1

          for (const v of activeVolunteers) {
            const notifId = generateId()
            placeholders.push(`($${pi}, $${pi + 1}, $${pi + 2}, $${pi + 3}, $${pi + 4}, $${pi + 5}, $${pi + 6}, NOW(), NOW())`)
            notifParams.push(notifId, v.id, 'volunteer', v.id, notifTitle, notifMessage, 'info')
            pi += 7
          }

          await client.query(
            `INSERT INTO "Notification" ("id", "userId", "userType", "volunteerId", "title", "message", "type", "createdAt", "updatedAt")
             VALUES ${placeholders.join(', ')}`,
            notifParams
          )
        }
      }

      return newEvent
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    // Build SET clause dynamically
    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (data.name) {
      setClauses.push(`"name" = $${paramIndex++}`)
      params.push(data.name)
    }
    if (data.description !== undefined) {
      setClauses.push(`"description" = $${paramIndex++}`)
      params.push(data.description || null)
    }
    if (data.needs) {
      setClauses.push(`"needs" = $${paramIndex++}`)
      params.push(JSON.stringify(data.needs))
    }
    if (data.startDate) {
      setClauses.push(`"startDate" = $${paramIndex++}`)
      params.push(data.startDate)
    }
    if (data.endDate !== undefined) {
      setClauses.push(`"endDate" = $${paramIndex++}`)
      params.push(data.endDate || null)
    }
    if (data.location !== undefined) {
      setClauses.push(`"location" = $${paramIndex++}`)
      params.push(data.location || null)
    }
    if (data.status) {
      setClauses.push(`"status" = $${paramIndex++}`)
      params.push(data.status)
    }
    if (data.image !== undefined) {
      setClauses.push(`"image" = $${paramIndex++}`)
      params.push(data.image || null)
    }

    if (setClauses.length === 0) {
      // Nothing to update, return current event
      const currentResult = await query('SELECT * FROM "Event" WHERE "id" = $1', [id])
      return NextResponse.json({ event: currentResult.rows[0] })
    }

    setClauses.push(`"updatedAt" = NOW()`)
    params.push(id) // for WHERE clause

    const eventResult = await query(
      `UPDATE "Event" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`,
      params
    )

    return NextResponse.json({ event: eventResult.rows[0] })
  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    await query('DELETE FROM "Event" WHERE "id" = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
