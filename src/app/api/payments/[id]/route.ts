import { NextRequest, NextResponse } from 'next/server'
import { query, generateId, transaction } from '@/lib/db'
import { enrichPayment } from '@/lib/helpers'

// GET - Get a single payment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const result = await query('SELECT * FROM "Payment" WHERE "id" = $1', [id])
    const payment = result.rows[0]

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const enrichedPayment = await enrichPayment(payment)
    return NextResponse.json({ payment: enrichedPayment })
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update payment status (mark as Completed, Failed, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 })
    }

    const validStatuses = ['Pending', 'Completed', 'Failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      )
    }

    // Check if payment exists
    const existingResult = await query('SELECT * FROM "Payment" WHERE "id" = $1', [id])
    const existingPayment = existingResult.rows[0]

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Get the associated donation
    let donation: Record<string, any> | null = null
    if (existingPayment.donationId) {
      const donationResult = await query(
        `SELECT "id", "status", "paymentStatus", "donorId", "type" FROM "Donation" WHERE "id" = $1`,
        [existingPayment.donationId],
      )
      donation = donationResult.rows[0] || null
    }

    // Update payment, sync donation, and create notification atomically
    const updatedRow = await transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE "Payment" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
        [status, id],
      )
      const updatedPayment = updateResult.rows[0]

      // If payment is marked as Completed, also update the donation's paymentStatus to Paid
      if (status === 'Completed' && donation) {
        await client.query(
          `UPDATE "Donation" SET "paymentStatus" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          ['Paid', donation.id],
        )
      }

      // If payment is marked as Failed, also update the donation's paymentStatus to Failed
      if (status === 'Failed' && donation) {
        await client.query(
          `UPDATE "Donation" SET "paymentStatus" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          ['Failed', donation.id],
        )
      }

      // Create notification for donor about payment status change
      try {
        const notificationType = status === 'Completed' ? 'success' : status === 'Failed' ? 'error' : 'info'
        const notificationTitle = status === 'Completed' ? 'Payment Confirmed' : 'Payment Update'
        const notificationMessage =
          status === 'Completed'
            ? `Your payment of ${existingPayment.amount} has been confirmed.`
            : `Your payment status has been updated to: ${status}`

        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "title", "message", "type", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            generateId(),
            existingPayment.donorId,
            'donor',
            existingPayment.donorId,
            notificationTitle,
            notificationMessage,
            notificationType,
          ],
        )
      } catch (e) {
        console.error('Failed to create payment notification:', e)
      }

      return updatedPayment
    })

    // Enrich for response
    const enrichedPayment = await enrichPayment(updatedRow)

    return NextResponse.json({
      payment: enrichedPayment,
      message: `Payment status updated to ${status}`,
    })
  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
