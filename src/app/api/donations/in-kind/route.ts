import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// POST - Create in-kind donation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donorId, items, pickupAddress, pickupTime, eventId, note, pickupLat, pickupLng } = body

    // Validate donor
    if (!donorId) {
      return NextResponse.json({ error: 'You must be logged in to make a donation. Please log in and try again.' }, { status: 401 })
    }

    const donorResult = await query('SELECT * FROM "Donor" WHERE "id" = $1', [donorId])
    if (donorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Donor account not found. Please log in again.' }, { status: 404 })
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Please add at least one item to donate.' }, { status: 400 })
    }

    const validItems = items.filter((item: { itemName?: string; quantity?: number }) =>
      item.itemName && String(item.itemName).trim() !== '' && item.quantity && Number(item.quantity) > 0
    )

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Please add at least one valid item with a name and quantity.' }, { status: 400 })
    }

    // Validate pickup address
    if (!pickupAddress || String(pickupAddress).trim() === '') {
      return NextResponse.json({ error: 'Pickup address is required.' }, { status: 400 })
    }

    // Create donation with items and task in a transaction
    const donation = await transaction(async (client) => {
      // Create donation
      const donationId = generateId()
      const donationResult = await client.query(
        `INSERT INTO "Donation" ("id", "donorId", "type", "note", "eventId", "status", "paymentStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [donationId, donorId, 'in-kind', note || null, eventId || null, 'Pending', 'Pending']
      )
      const newDonation = donationResult.rows[0]

      // Create items
      const createdItems: unknown[] = []
      for (const item of validItems as { itemName: string; quantity: number; category?: string }[]) {
        const itemId = generateId()
        const itemResult = await client.query(
          `INSERT INTO "DonationItem" ("id", "donationId", "itemName", "quantity", "remainingQuantity", "category", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
          [itemId, donationId, String(item.itemName).trim(), Number(item.quantity), Number(item.quantity), item.category || 'others']
        )
        createdItems.push(itemResult.rows[0])
      }

      // Create task for pickup
      const taskId = generateId()
      const taskResult = await client.query(
        `INSERT INTO "Task" ("id", "donationId", "pickupAddress", "pickupTime", "pickupLat", "pickupLng", "status", "priority", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [taskId, donationId, String(pickupAddress).trim(), pickupTime || null, pickupLat || null, pickupLng || null, 'Open', 'Normal']
      )

      newDonation.items = createdItems
      newDonation.tasks = [taskResult.rows[0]]

      return newDonation
    })

    return NextResponse.json({
      success: true,
      donation,
      message: 'Your in-kind donation has been submitted! We will contact you for pickup.'
    })
  } catch (error) {
    console.error('Create in-kind donation error:', error)
    return NextResponse.json({
      error: 'Failed to process donation. Please try again.',
      details: (error as Error).message
    }, { status: 500 })
  }
}
