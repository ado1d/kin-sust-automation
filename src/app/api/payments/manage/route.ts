import { NextRequest, NextResponse } from 'next/server'
import { query, generateId, transaction } from '@/lib/db'
import { enrichPayments, enrichPayment } from '@/lib/helpers'

// GET - List all payments with optional filters (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const donorId = searchParams.get('donorId')
    const donationId = searchParams.get('donationId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build dynamic WHERE clause
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (status) {
      conditions.push(`p."status" = $${paramIdx++}`)
      params.push(status)
    }
    if (method) {
      conditions.push(`p."method" = $${paramIdx++}`)
      params.push(method)
    }
    if (donorId) {
      conditions.push(`p."donorId" = $${paramIdx++}`)
      params.push(donorId)
    }
    if (donationId) {
      conditions.push(`p."donationId" = $${paramIdx++}`)
      params.push(donationId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Run count and data queries in parallel
    const countParams = params.slice() // copy for count query
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM "Payment" p ${whereClause}`,
      countParams,
    )

    // Add pagination params
    params.push(limit)
    const limitParamIdx = paramIdx
    params.push(offset)
    const offsetParamIdx = paramIdx + 1

    const dataResult = await query(
      `SELECT p.* FROM "Payment" p ${whereClause} ORDER BY p."createdAt" DESC LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      params,
    )

    const total = countResult.rows[0].total
    const payments = await enrichPayments(dataResult.rows)

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get managed payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update payment status (approve/reject payment proofs)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, status, notes } = body

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentId and status' },
        { status: 400 },
      )
    }

    const validStatuses = ['Pending', 'Completed', 'Failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      )
    }

    // Check if payment exists
    const existingResult = await query('SELECT * FROM "Payment" WHERE "id" = $1', [paymentId])
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
        [status, paymentId],
      )
      const updatedPayment = updateResult.rows[0]

      // Sync donation paymentStatus with payment status
      if (donation) {
        const donationUpdates: string[] = []
        const donationParams: unknown[] = []
        let dParamIdx = 1

        if (status === 'Completed') {
          donationUpdates.push(`"paymentStatus" = $${dParamIdx++}`)
          donationParams.push('Paid')
        } else if (status === 'Failed') {
          donationUpdates.push(`"paymentStatus" = $${dParamIdx++}`)
          donationParams.push('Failed')
        }

        // If payment is approved (Completed) and donation is still Pending, auto-verify it
        if (status === 'Completed' && donation.status === 'Pending') {
          donationUpdates.push(`"status" = $${dParamIdx++}`)
          donationParams.push('Verified')
        }

        if (donationUpdates.length > 0) {
          donationUpdates.push(`"updatedAt" = NOW()`)
          donationParams.push(donation.id)
          await client.query(
            `UPDATE "Donation" SET ${donationUpdates.join(', ')} WHERE "id" = $${dParamIdx}`,
            donationParams,
          )
        }
      }

      // Create notification for donor about payment status change
      try {
        const notificationType = status === 'Completed' ? 'success' : status === 'Failed' ? 'error' : 'info'
        const notificationTitle = status === 'Completed' ? 'Payment Approved' : 'Payment Update'
        const notificationMessage =
          status === 'Completed'
            ? `Your payment of ${existingPayment.amount} has been approved.${notes ? ` Note: ${notes}` : ''}`
            : status === 'Failed'
              ? `Your payment of ${existingPayment.amount} has been rejected.${notes ? ` Reason: ${notes}` : ''}`
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

      return { payment: updatedPayment, donationAutoVerified: status === 'Completed' && donation?.status === 'Pending' }
    })

    // Enrich for response
    const enrichedPayment = await enrichPayment(updatedRow.payment)

    return NextResponse.json({
      payment: enrichedPayment,
      message: `Payment status updated to ${status}${updatedRow.donationAutoVerified ? '. Associated donation has been auto-verified.' : ''}`,
    })
  } catch (error) {
    console.error('Manage payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
