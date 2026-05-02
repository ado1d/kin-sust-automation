import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    // Check if donation exists
    const donationResult = await query(
      `SELECT * FROM "Donation" WHERE "id" = $1`,
      [id]
    )

    if (donationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donation = donationResult.rows[0]

    if (donation.status === 'Rejected') {
      return NextResponse.json({ error: 'Donation is already rejected' }, { status: 400 })
    }

    if (donation.status === 'Released') {
      return NextResponse.json({ error: 'Cannot reject a released donation' }, { status: 400 })
    }

    // Build update data
    const updateNote = reason ? `${donation.note || ''}\nRejection reason: ${reason}`.trim() : donation.note
    const shouldUpdatePaymentStatus = donation.type === 'monetary' && donation.paymentStatus === 'Pending'

    // Update donation, cancel tasks, and create notification in a transaction
    const updatedDonation = await transaction(async (client) => {
      // Update donation to rejected
      let updateSql: string
      let updateParams: unknown[]

      if (shouldUpdatePaymentStatus) {
        updateSql = `UPDATE "Donation" SET "status" = $1, "note" = $2, "paymentStatus" = $3, "updatedAt" = NOW() WHERE "id" = $4 RETURNING *`
        updateParams = ['Rejected', updateNote, 'Failed', id]
      } else {
        updateSql = `UPDATE "Donation" SET "status" = $1, "note" = $2, "updatedAt" = NOW() WHERE "id" = $3 RETURNING *`
        updateParams = ['Rejected', updateNote, id]
      }

      const updateResult = await client.query(updateSql, updateParams)
      const updated = updateResult.rows[0]

      // Fetch related data
      const [donorResult, eventResult, itemsResult] = await Promise.all([
        client.query('SELECT * FROM "Donor" WHERE "id" = $1', [updated.donorId]),
        updated.eventId ? client.query('SELECT * FROM "Event" WHERE "id" = $1', [updated.eventId]) : Promise.resolve({ rows: [] }),
        client.query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [id])
      ])

      updated.donor = donorResult.rows[0] || null
      updated.event = eventResult.rows[0] || null
      updated.items = itemsResult.rows

      // Cancel any associated open/assigned tasks (not verified ones)
      await client.query(
        `UPDATE "Task" SET "status" = $1, "updatedAt" = NOW() WHERE "donationId" = $2 AND "status" IN ('Open', 'Assigned')`,
        ['Verified', id]
      )

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
            'Donation Rejected',
            `Your ${donation.type} donation has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
            'error'
          ]
        )
      } catch (e) {
        console.error('Failed to create donor notification:', e)
      }

      return updated
    })

    return NextResponse.json({ donation: updatedDonation })
  } catch (error) {
    console.error('Reject donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
