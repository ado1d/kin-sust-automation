import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Get counts - run all count queries in parallel
    const [
      donorCountResult,
      volunteerCountResult,
      activeVolunteerCountResult,
      pendingVolunteerCountResult,
      eventCountResult,
      activeEventCountResult,
      donationCountResult,
      pendingDonationCountResult,
      verifiedDonationCountResult,
      taskCountResult,
      openTaskCountResult,
      completedTaskCountResult
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM "Donor"'),
      query('SELECT COUNT(*)::int AS count FROM "Volunteer"'),
      query('SELECT COUNT(*)::int AS count FROM "Volunteer" WHERE status = $1', ['Active']),
      query('SELECT COUNT(*)::int AS count FROM "Volunteer" WHERE status = $1', ['Pending']),
      query('SELECT COUNT(*)::int AS count FROM "Event"'),
      query('SELECT COUNT(*)::int AS count FROM "Event" WHERE status = $1', ['Published']),
      query('SELECT COUNT(*)::int AS count FROM "Donation"'),
      query('SELECT COUNT(*)::int AS count FROM "Donation" WHERE status = $1', ['Pending']),
      query('SELECT COUNT(*)::int AS count FROM "Donation" WHERE status = $1', ['Verified']),
      query('SELECT COUNT(*)::int AS count FROM "Task"'),
      query('SELECT COUNT(*)::int AS count FROM "Task" WHERE status = $1', ['Open']),
      query('SELECT COUNT(*)::int AS count FROM "Task" WHERE status IN ($1, $2)', ['Completed', 'Verified'])
    ])

    const donorCount = donorCountResult.rows[0].count
    const volunteerCount = volunteerCountResult.rows[0].count
    const activeVolunteerCount = activeVolunteerCountResult.rows[0].count
    const pendingVolunteerCount = pendingVolunteerCountResult.rows[0].count
    const eventCount = eventCountResult.rows[0].count
    const activeEventCount = activeEventCountResult.rows[0].count
    const donationCount = donationCountResult.rows[0].count
    const pendingDonationCount = pendingDonationCountResult.rows[0].count
    const verifiedDonationCount = verifiedDonationCountResult.rows[0].count
    const taskCount = taskCountResult.rows[0].count
    const openTaskCount = openTaskCountResult.rows[0].count
    const completedTaskCount = completedTaskCountResult.rows[0].count

    // Get total monetary amount
    const monetaryTotalResult = await query(
      'SELECT COALESCE(SUM("amount"), 0) AS total FROM "Donation" WHERE type = $1 AND status = $2',
      ['monetary', 'Verified']
    )
    const totalMonetary = parseFloat(monetaryTotalResult.rows[0].total) || 0

    // Get donations by type
    const donationsByTypeResult = await query(
      'SELECT type, COUNT("id")::int AS count FROM "Donation" GROUP BY type'
    )
    const donationsByType = donationsByTypeResult.rows.map(d => ({ type: d.type, count: d.count }))

    // Get items by category
    const itemsByCategoryResult = await query(
      'SELECT category, COALESCE(SUM("quantity"), 0)::int AS quantity FROM "DonationItem" GROUP BY category'
    )
    const itemsByCategory = itemsByCategoryResult.rows.map(i => ({
      category: i.category,
      quantity: i.quantity
    }))

    // Get recent donations with donor and event names via JOINs
    const recentDonationsResult = await query(
      `SELECT d.*, dn."name" AS "donorName", e."name" AS "eventName"
       FROM "Donation" d
       LEFT JOIN "Donor" dn ON d."donorId" = dn."id"
       LEFT JOIN "Event" e ON d."eventId" = e."id"
       ORDER BY d."createdAt" DESC
       LIMIT 5`
    )
    const recentDonations = recentDonationsResult.rows.map(d => ({
      ...d,
      donor: d.donorName ? { name: d.donorName } : null,
      event: d.eventName ? { name: d.eventName } : null,
      donorName: undefined,
      eventName: undefined
    }))

    // Get recent tasks with volunteer and donation donor info
    const recentTasksResult = await query(
      `SELECT t.*,
        v."name" AS "volunteerName",
        dn."name" AS "donorName"
       FROM "Task" t
       LEFT JOIN "Volunteer" v ON t."volunteerId" = v."id"
       LEFT JOIN "Donation" don ON t."donationId" = don."id"
       LEFT JOIN "Donor" dn ON don."donorId" = dn."id"
       ORDER BY t."createdAt" DESC
       LIMIT 5`
    )
    const recentTasks = recentTasksResult.rows.map(t => ({
      ...t,
      volunteer: t.volunteerName ? { name: t.volunteerName } : null,
      donation: t.donationId ? {
        donor: t.donorName ? { name: t.donorName } : null
      } : null,
      volunteerName: undefined,
      donorName: undefined
    }))

    // Get donations over time (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const donationsResult = await query(
      `SELECT "createdAt", type, amount, status FROM "Donation" WHERE "createdAt" >= $1`,
      [sixMonthsAgo]
    )

    // Group donations by month
    const monthlyDonations: Record<string, { count: number; amount: number }> = {}
    donationsResult.rows.forEach(d => {
      const monthKey = new Date(d.createdAt).toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyDonations[monthKey]) {
        monthlyDonations[monthKey] = { count: 0, amount: 0 }
      }
      monthlyDonations[monthKey].count++
      if (d.amount && d.status === 'Verified') {
        monthlyDonations[monthKey].amount += parseFloat(d.amount)
      }
    })

    // Get task status distribution
    const taskStatusDistributionResult = await query(
      'SELECT status, COUNT("id")::int AS count FROM "Task" GROUP BY status'
    )
    const taskStatusDistribution = taskStatusDistributionResult.rows.map(t => ({
      status: t.status,
      count: t.count
    }))

    // Get donation status distribution
    const donationStatusDistributionResult = await query(
      'SELECT status, COUNT("id")::int AS count FROM "Donation" GROUP BY status'
    )
    const donationStatusDistribution = donationStatusDistributionResult.rows.map(d => ({
      status: d.status,
      count: d.count
    }))

    return NextResponse.json({
      counts: {
        donors: donorCount,
        volunteers: volunteerCount,
        activeVolunteers: activeVolunteerCount,
        pendingVolunteers: pendingVolunteerCount,
        events: eventCount,
        activeEvents: activeEventCount,
        donations: donationCount,
        pendingDonations: pendingDonationCount,
        verifiedDonations: verifiedDonationCount,
        tasks: taskCount,
        openTasks: openTaskCount,
        completedTasks: completedTaskCount,
        totalMonetary
      },
      charts: {
        donationsByType,
        itemsByCategory,
        monthlyDonations: Object.entries(monthlyDonations)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        taskStatusDistribution,
        donationStatusDistribution
      },
      recent: {
        donations: recentDonations,
        tasks: recentTasks
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
