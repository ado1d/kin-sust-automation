import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { notes, forceVerify } = body

    // Check if donation exists with items and tasks
    const donationResult = await query(
      `SELECT * FROM "Donation" WHERE "id" = $1`,
      [id]
    )

    if (donationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donation = donationResult.rows[0]

    if (donation.status !== 'Pending') {
      return NextResponse.json({ error: 'Donation is not pending' }, { status: 400 })
    }

    // Fetch items and tasks for validation
    const [itemsResult, tasksResult] = await Promise.all([
      query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [id]),
      query('SELECT * FROM "Task" WHERE "donationId" = $1', [id])
    ])

    const items = itemsResult.rows
    const tasks = tasksResult.rows

    // For cash or in-kind donations with pickup, check if task is verified
    if (donation.type === 'in-kind' || donation.paymentMethod === 'cash') {
      const hasVerifiedTask = tasks.some((t: Record<string, unknown>) => t.status === 'Verified')
      if (!hasVerifiedTask) {
        return NextResponse.json({
          error: 'Cash/In-kind donations require verified pickup task before donation verification',
          hint: 'Verify the pickup task first, or use a different donation type'
        }, { status: 400 })
      }
    }

    // For online monetary donations, admin can verify directly
    if (donation.type === 'monetary' && donation.paymentMethod === 'online') {
      if (donation.paymentStatus !== 'Paid' && !forceVerify) {
        return NextResponse.json({
          error: 'Online donation payment has not been completed yet',
          hint: 'Use forceVerify: true to verify this donation anyway (admin override)',
          currentPaymentStatus: donation.paymentStatus
        }, { status: 400 })
      }
    }

    // Build update data
    const updateNote = notes ? `${donation.note || ''}\n${notes}`.trim() : donation.note
    const shouldUpdatePaymentStatus = donation.type === 'monetary' && donation.paymentMethod === 'online' && donation.paymentStatus !== 'Paid'

    // Update donation and create notification in a transaction
    const updatedDonation = await transaction(async (client) => {
      let updateSql: string
      let updateParams: unknown[]

      if (shouldUpdatePaymentStatus) {
        updateSql = `UPDATE "Donation" SET "status" = $1, "note" = $2, "paymentStatus" = $3, "updatedAt" = NOW() WHERE "id" = $4 RETURNING *`
        updateParams = ['Verified', updateNote, 'Paid', id]
      } else {
        updateSql = `UPDATE "Donation" SET "status" = $1, "note" = $2, "updatedAt" = NOW() WHERE "id" = $3 RETURNING *`
        updateParams = ['Verified', updateNote, id]
      }

      const updateResult = await client.query(updateSql, updateParams)
      const updated = updateResult.rows[0]

      // Fetch related data
      const [donorResult, eventResult, updatedItemsResult, updatedTasksResult] = await Promise.all([
        client.query('SELECT * FROM "Donor" WHERE "id" = $1', [updated.donorId]),
        updated.eventId ? client.query('SELECT * FROM "Event" WHERE "id" = $1', [updated.eventId]) : Promise.resolve({ rows: [] }),
        client.query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [id]),
        client.query(
          `SELECT t.*, v."id" AS "volunteerId_col", v."name" AS "volunteerName"
           FROM "Task" t
           LEFT JOIN "Volunteer" v ON t."volunteerId" = v."id"
           WHERE t."donationId" = $1`,
          [id]
        )
      ])

      updated.donor = donorResult.rows[0] || null
      updated.event = eventResult.rows[0] || null
      updated.items = updatedItemsResult.rows
      updated.tasks = updatedTasksResult.rows.map((t: Record<string, unknown>) => ({
        ...t,
        volunteer: t.volunteerId_col ? { id: t.volunteerId_col, name: t.volunteerName } : null,
        volunteerId_col: undefined,
        volunteerName: undefined
      }))

      // Create notification for donor
      try {
        const notificationId = generateId()
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "title", "message", "type", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            notificationId,
            donation.donorId,
            'donor',
            donation.donorId,
            'Donation Verified',
            `Your ${donation.type} donation has been verified by admin.`,
            'success'
          ]
        )
      } catch (e) {
        console.error('Failed to create donor notification:', e)
      }

      return updated
    })

    return NextResponse.json({
      donation: updatedDonation,
      warning: forceVerify && donation.paymentStatus !== 'Paid'
        ? 'Donation was force-verified despite incomplete payment status'
        : undefined
    })
  } catch (error) {
    console.error('Verify donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
