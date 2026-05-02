import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// POST - Create monetary donation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donorId, amount, paymentMethod, eventId, note, proofDocument, pickupAddress, pickupLat, pickupLng } = body

    // Validate required fields
    if (!donorId) {
      return NextResponse.json({ error: 'You must be logged in to make a donation. Please log in and try again.' }, { status: 401 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid donation amount greater than 0.' }, { status: 400 })
    }

    // Check if donor exists
    const donorResult = await query('SELECT * FROM "Donor" WHERE "id" = $1', [donorId])
    if (donorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Donor account not found. Please log in again.' }, { status: 404 })
    }
    const donor = donorResult.rows[0]

    // Normalize payment method
    const isOnlinePayment = paymentMethod?.toLowerCase().includes('online')
    const normalizedPaymentMethod = isOnlinePayment ? 'online' : 'cash'

    // Validate pickup address for cash pickup
    if (normalizedPaymentMethod === 'cash' && (!pickupAddress || pickupAddress.trim() === '')) {
      return NextResponse.json({ error: 'Pickup address is required for cash pickup donations.' }, { status: 400 })
    }

    // Create donation, optional payment, and optional task in a transaction
    const donation = await transaction(async (client) => {
      // Create donation
      const donationId = generateId()
      const donationResult = await client.query(
        `INSERT INTO "Donation" ("id", "donorId", "type", "amount", "remainingAmount", "paymentMethod", "note", "eventId", "status", "paymentStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [donationId, donorId, 'monetary', parsedAmount, parsedAmount, normalizedPaymentMethod, note || null, eventId || null, 'Pending', 'Pending']
      )
      const newDonation = donationResult.rows[0]

      // If online payment with proof, create payment record
      if (normalizedPaymentMethod === 'online' && proofDocument) {
        const paymentId = generateId()
        await client.query(
          `INSERT INTO "Payment" ("id", "donationId", "donorId", "method", "amount", "status", "proofPath", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [paymentId, donationId, donorId, 'online', parsedAmount, 'Pending', proofDocument]
        )
      }

      // If cash pickup, create a task with the provided pickup address and coordinates
      if (normalizedPaymentMethod === 'cash') {
        const taskId = generateId()
        await client.query(
          `INSERT INTO "Task" ("id", "donationId", "pickupAddress", "pickupLat", "pickupLng", "status", "priority", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [taskId, donationId, pickupAddress.trim() || donor.address || 'Address not provided', pickupLat || null, pickupLng || null, 'Open', 'Normal']
        )
      }

      return newDonation
    })

    const message = normalizedPaymentMethod === 'cash'
      ? 'Your cash pickup donation has been submitted! A volunteer will contact you soon to collect the donation.'
      : 'Your donation has been submitted successfully! Thank you for your generosity.'

    return NextResponse.json({
      success: true,
      donation,
      message
    })
  } catch (error) {
    console.error('Create monetary donation error:', error)
    return NextResponse.json({
      error: 'Failed to process donation. Please try again.',
      details: (error as Error).message
    }, { status: 500 })
  }
}
