import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Get all donations with full details
    // We need: donor, event, items, tasks (with volunteer), distributions, payments
    // Strategy: fetch donations, then fetch related data and assemble in JS

    const donationsResult = await query(
      `SELECT d.*,
        json_build_object('id', dn.id, 'name', dn.name, 'email', dn.email, 'phone', dn.phone) AS donor,
        CASE WHEN e.id IS NOT NULL THEN
          json_build_object('id', e.id, 'name', e.name)
        ELSE NULL END AS event
       FROM "Donation" d
       LEFT JOIN "Donor" dn ON d."donorId" = dn.id
       LEFT JOIN "Event" e ON d."eventId" = e.id
       ORDER BY d."createdAt" DESC`
    )
    const donations = donationsResult.rows

    if (donations.length === 0) {
      if (format === 'csv') {
        return new NextResponse('Donation ID,Type,Amount,Remaining Amount,Status,Payment Status,Payment Method,Donor Name,Donor Email,Donor Phone,Event Name,Items,Pickup Address,Task Status,Volunteer,Distributions,Created At\n', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="donations-audit.csv"'
          }
        })
      }
      return NextResponse.json({ donations: [] })
    }

    const donationIds = donations.map((d: any) => d.id)

    // Fetch items for all donations
    const itemsResult = await query(
      `SELECT * FROM "DonationItem" WHERE "donationId" = ANY($1)`,
      [donationIds]
    )
    const itemsByDonation = new Map<string, any[]>()
    for (const item of itemsResult.rows) {
      const list = itemsByDonation.get(item.donationId) || []
      list.push(item)
      itemsByDonation.set(item.donationId, list)
    }

    // Fetch tasks with volunteer info for all donations
    const tasksResult = await query(
      `SELECT t.*, json_build_object('id', v.id, 'name', v.name) AS volunteer
       FROM "Task" t
       LEFT JOIN "Volunteer" v ON t."volunteerId" = v.id
       WHERE t."donationId" = ANY($1)`,
      [donationIds]
    )
    const tasksByDonation = new Map<string, any[]>()
    for (const task of tasksResult.rows) {
      const list = tasksByDonation.get(task.donationId) || []
      list.push(task)
      tasksByDonation.set(task.donationId, list)
    }

    // Fetch distributions for all donations
    const distributionsResult = await query(
      `SELECT * FROM "DonationDistribution" WHERE "donationId" = ANY($1)`,
      [donationIds]
    )
    const distributionsByDonation = new Map<string, any[]>()
    for (const dist of distributionsResult.rows) {
      const list = distributionsByDonation.get(dist.donationId) || []
      list.push(dist)
      distributionsByDonation.set(dist.donationId, list)
    }

    // Fetch payments for all donations
    const paymentsResult = await query(
      `SELECT * FROM "Payment" WHERE "donationId" = ANY($1)`,
      [donationIds]
    )
    const paymentsByDonation = new Map<string, any[]>()
    for (const payment of paymentsResult.rows) {
      const list = paymentsByDonation.get(payment.donationId) || []
      list.push(payment)
      paymentsByDonation.set(payment.donationId, list)
    }

    // Assemble full donation objects
    const fullDonations = donations.map((d: any) => ({
      ...d,
      items: itemsByDonation.get(d.id) || [],
      tasks: tasksByDonation.get(d.id) || [],
      distributions: distributionsByDonation.get(d.id) || [],
      payments: paymentsByDonation.get(d.id) || []
    }))

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Donation ID',
        'Type',
        'Amount',
        'Remaining Amount',
        'Status',
        'Payment Status',
        'Payment Method',
        'Donor Name',
        'Donor Email',
        'Donor Phone',
        'Event Name',
        'Items',
        'Pickup Address',
        'Task Status',
        'Volunteer',
        'Distributions',
        'Created At'
      ]

      const rows = fullDonations.map((d: any) => {
        const items = (d.items || []).map((i: any) => `${i.itemName}(${i.quantity})`).join('; ')
        const pickupAddress = d.tasks[0]?.pickupAddress || ''
        const taskStatus = d.tasks[0]?.status || ''
        const volunteer = d.tasks[0]?.volunteer?.name || ''
        const distributions = (d.distributions || []).map((dist: any) =>
          dist.amount ? `৳${dist.amount}` : `${dist.itemName}(${dist.quantity})`
        ).join('; ')

        return [
          d.id,
          d.type,
          d.amount || '',
          d.remainingAmount || '',
          d.status,
          d.paymentStatus,
          d.paymentMethod || '',
          d.donor?.name || '',
          d.donor?.email || '',
          d.donor?.phone || '',
          d.event?.name || '',
          items,
          pickupAddress,
          taskStatus,
          volunteer,
          distributions,
          new Date(d.createdAt).toISOString()
        ]
      })

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="donations-audit.csv"'
        }
      })
    }

    return NextResponse.json({ donations: fullDonations })
  } catch (error) {
    console.error('Audit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
