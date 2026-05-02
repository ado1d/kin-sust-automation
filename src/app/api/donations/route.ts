import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// GET - List all donations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const donorId = searchParams.get('donorId')
    const eventId = searchParams.get('eventId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (id) {
      // Fetch donation by ID with all related data
      const donationResult = await query(
        `SELECT * FROM "Donation" WHERE "id" = $1`,
        [id]
      )
      if (donationResult.rows.length === 0) {
        return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
      }
      const donation = donationResult.rows[0]

      // Fetch related data in parallel
      const [donorResult, eventResult, itemsResult, tasksResult, distributionsResult, paymentsResult] = await Promise.all([
        query('SELECT * FROM "Donor" WHERE "id" = $1', [donation.donorId]),
        donation.eventId ? query('SELECT * FROM "Event" WHERE "id" = $1', [donation.eventId]) : Promise.resolve({ rows: [] }),
        query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [id]),
        query('SELECT t.*, v."id" AS "volunteerId", v."name" AS "volunteerName", v."email" AS "volunteerEmail", v."phone" AS "volunteerPhone" FROM "Task" t LEFT JOIN "Volunteer" v ON t."volunteerId" = v."id" WHERE t."donationId" = $1', [id]),
        query('SELECT * FROM "DonationDistribution" WHERE "donationId" = $1', [id]),
        query('SELECT * FROM "Payment" WHERE "donationId" = $1', [id])
      ])

      donation.donor = donorResult.rows[0] || null
      donation.event = eventResult.rows[0] || null
      donation.items = itemsResult.rows
      donation.tasks = tasksResult.rows.map(t => ({
        ...t,
        volunteer: t.volunteerId ? { id: t.volunteerId, name: t.volunteerName, email: t.volunteerEmail, phone: t.volunteerPhone } : null,
        volunteerId: undefined,
        volunteerName: undefined,
        volunteerEmail: undefined,
        volunteerPhone: undefined
      }))
      donation.distributions = distributionsResult.rows
      donation.payments = paymentsResult.rows

      return NextResponse.json({ donation })
    }

    // Build WHERE clause dynamically
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (donorId) {
      conditions.push(`d."donorId" = $${paramIndex++}`)
      params.push(donorId)
    }
    if (eventId) {
      conditions.push(`d."eventId" = $${paramIndex++}`)
      params.push(eventId)
    }
    if (status) {
      conditions.push(`d."status" = $${paramIndex++}`)
      params.push(status)
    }
    if (type) {
      conditions.push(`d."type" = $${paramIndex++}`)
      params.push(type)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get donations with donor and event info
    const donationsResult = await query(
      `SELECT d.*,
        dn."id" AS "donorId_col", dn."name" AS "donorName", dn."email" AS "donorEmail", dn."phone" AS "donorPhone",
        e."id" AS "eventId_col", e."name" AS "eventName"
       FROM "Donation" d
       LEFT JOIN "Donor" dn ON d."donorId" = dn."id"
       LEFT JOIN "Event" e ON d."eventId" = e."id"
       ${whereClause}
       ORDER BY d."createdAt" DESC`,
      params
    )

    // Fetch items, tasks, and counts for all donations
    const donationIds = donationsResult.rows.map(d => d.id)

    let itemsMap: Record<string, unknown[]> = {}
    let tasksMap: Record<string, unknown[]> = {}
    let itemCountsMap: Record<string, number> = {}
    let taskCountsMap: Record<string, number> = {}

    if (donationIds.length > 0) {
      const placeholders = donationIds.map((_, i) => `$${i + 1}`).join(', ')

      const [itemsResult, tasksWithVolunteersResult, itemCountsResult, taskCountsResult] = await Promise.all([
        query(`SELECT * FROM "DonationItem" WHERE "donationId" IN (${placeholders})`, donationIds),
        query(
          `SELECT t.*, v."id" AS "volunteerId_col", v."name" AS "volunteerName"
           FROM "Task" t
           LEFT JOIN "Volunteer" v ON t."volunteerId" = v."id"
           WHERE t."donationId" IN (${placeholders})`,
          donationIds
        ),
        query(`SELECT "donationId", COUNT("id")::int AS count FROM "DonationItem" WHERE "donationId" IN (${placeholders}) GROUP BY "donationId"`, donationIds),
        query(`SELECT "donationId", COUNT("id")::int AS count FROM "Task" WHERE "donationId" IN (${placeholders}) GROUP BY "donationId"`, donationIds)
      ])

      itemsResult.rows.forEach(item => {
        if (!itemsMap[item.donationId]) itemsMap[item.donationId] = []
        itemsMap[item.donationId].push(item)
      })

      tasksWithVolunteersResult.rows.forEach(t => {
        if (!tasksMap[t.donationId]) tasksMap[t.donationId] = []
        tasksMap[t.donationId].push({
          ...t,
          volunteer: t.volunteerId_col ? { id: t.volunteerId_col, name: t.volunteerName } : null,
          volunteerId_col: undefined,
          volunteerName: undefined
        })
      })

      itemCountsResult.rows.forEach(r => { itemCountsMap[r.donationId] = r.count })
      taskCountsResult.rows.forEach(r => { taskCountsMap[r.donationId] = r.count })
    }

    const donations = donationsResult.rows.map(d => ({
      ...d,
      donor: d.donorId_col ? { id: d.donorId_col, name: d.donorName, email: d.donorEmail, phone: d.donorPhone } : null,
      event: d.eventId_col ? { id: d.eventId_col, name: d.eventName } : null,
      items: itemsMap[d.id] || [],
      tasks: tasksMap[d.id] || [],
      _count: {
        items: itemCountsMap[d.id] || 0,
        tasks: taskCountsMap[d.id] || 0
      },
      donorId_col: undefined,
      donorName: undefined,
      donorEmail: undefined,
      donorPhone: undefined,
      eventId_col: undefined,
      eventName: undefined
    }))

    return NextResponse.json({ donations })
  } catch (error) {
    console.error('Get donations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new donation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donorId, type, amount, note, paymentMethod, eventId, items, pickupAddress, pickupTime } = body

    if (!donorId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create donation with items and task in a transaction
    const donation = await transaction(async (client) => {
      const donationId = generateId()
      const donationResult = await client.query(
        `INSERT INTO "Donation" ("id", "donorId", "type", "amount", "remainingAmount", "note", "paymentMethod", "eventId", "status", "paymentStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          donationId,
          donorId,
          type,
          type === 'monetary' ? amount : null,
          type === 'monetary' ? amount : null,
          note || null,
          paymentMethod || null,
          eventId || null,
          'Pending',
          'Pending'
        ]
      )
      const newDonation = donationResult.rows[0]

      // Create items if provided
      let createdItems: unknown[] = []
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items as { itemName: string; quantity: number; category?: string; description?: string }[]) {
          const itemId = generateId()
          const itemResult = await client.query(
            `INSERT INTO "DonationItem" ("id", "donationId", "itemName", "quantity", "remainingQuantity", "category", "description", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             RETURNING *`,
            [itemId, donationId, item.itemName, item.quantity, item.quantity, item.category || 'others', item.description || null]
          )
          createdItems.push(itemResult.rows[0])
        }
      }

      // Create task for in-kind donations with pickup address
      let createdTasks: unknown[] = []
      if (type === 'in-kind' && pickupAddress) {
        const taskId = generateId()
        const taskResult = await client.query(
          `INSERT INTO "Task" ("id", "donationId", "pickupAddress", "pickupTime", "status", "priority", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
          [taskId, donationId, pickupAddress, pickupTime || null, 'Open', 'Normal']
        )
        createdTasks.push(taskResult.rows[0])
      }

      // Fetch donor info for notification
      const donorResult = await client.query('SELECT "name" FROM "Donor" WHERE "id" = $1', [donorId])
      const donorName = donorResult.rows[0]?.name || 'Unknown'

      // Create notification for admin
      const notificationId = generateId()
      await client.query(
        `INSERT INTO "Notification" ("id", "userId", "userType", "title", "message", "type", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          notificationId,
          'admin',
          'admin',
          'New Donation Submitted',
          `${donorName} submitted a ${type === 'monetary' ? `৳${amount} monetary` : 'in-kind'} donation.`,
          'info'
        ]
      )

      newDonation.items = createdItems
      newDonation.tasks = createdTasks
      newDonation.donor = donorResult.rows[0] || null

      return newDonation
    })

    return NextResponse.json({ donation })
  } catch (error) {
    console.error('Create donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update donation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 })
    }

    // Build SET clause dynamically
    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (data.status) {
      setClauses.push(`"status" = $${paramIndex++}`)
      params.push(data.status)
    }
    if (data.paymentStatus) {
      setClauses.push(`"paymentStatus" = $${paramIndex++}`)
      params.push(data.paymentStatus)
    }
    if (data.amount !== undefined) {
      setClauses.push(`"amount" = $${paramIndex++}`)
      params.push(data.amount)
      setClauses.push(`"remainingAmount" = $${paramIndex++}`)
      params.push(data.amount)
    }
    if (data.note !== undefined) {
      setClauses.push(`"note" = $${paramIndex++}`)
      params.push(data.note || null)
    }
    if (data.paymentMethod !== undefined) {
      setClauses.push(`"paymentMethod" = $${paramIndex++}`)
      params.push(data.paymentMethod || null)
    }
    if (data.eventId !== undefined) {
      setClauses.push(`"eventId" = $${paramIndex++}`)
      params.push(data.eventId || null)
    }

    setClauses.push(`"updatedAt" = NOW()`)
    params.push(id)

    const donation = await transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE "Donation" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`,
        params
      )
      const updatedDonation = updateResult.rows[0]

      // Fetch related data
      const [donorResult, itemsResult, tasksResult] = await Promise.all([
        client.query('SELECT * FROM "Donor" WHERE "id" = $1', [updatedDonation.donorId]),
        client.query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [id]),
        client.query('SELECT * FROM "Task" WHERE "donationId" = $1', [id])
      ])

      updatedDonation.items = itemsResult.rows
      updatedDonation.tasks = tasksResult.rows
      updatedDonation.donor = donorResult.rows[0] || null

      // Create notification for donor when status changes
      if (data.status && updatedDonation.donorId) {
        const notificationType = data.status === 'Verified' ? 'success' : data.status === 'Rejected' ? 'error' : 'info'
        const notificationId = generateId()
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "title", "message", "type", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            notificationId,
            updatedDonation.donorId,
            'donor',
            updatedDonation.donorId,
            `Donation ${data.status}`,
            `Your ${updatedDonation.type === 'monetary' ? 'monetary' : 'in-kind'} donation has been ${data.status.toLowerCase()}.`,
            notificationType
          ]
        )
      }

      return updatedDonation
    })

    return NextResponse.json({ donation })
  } catch (error) {
    console.error('Update donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete donation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 })
    }

    await query('DELETE FROM "Donation" WHERE "id" = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
