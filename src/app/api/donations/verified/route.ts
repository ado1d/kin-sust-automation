import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Get all verified AND released donations with donor and event info
    const donationsResult = await query(
      `SELECT d.*,
        dn."id" AS "donorId_col", dn."name" AS "donorName", dn."email" AS "donorEmail", dn."phone" AS "donorPhone",
        e."id" AS "eventId_col", e."name" AS "eventName"
       FROM "Donation" d
       LEFT JOIN "Donor" dn ON d."donorId" = dn."id"
       LEFT JOIN "Event" e ON d."eventId" = e."id"
       WHERE d."status" IN ('Verified', 'Released')
       ORDER BY d."createdAt" DESC`
    )

    const donationIds = donationsResult.rows.map(d => d.id)

    if (donationIds.length === 0) {
      return NextResponse.json({
        donations: [],
        activeDonations: [],
        summary: {
          totalMonetaryDonated: 0,
          totalMonetaryDistributed: 0,
          totalMonetaryRemaining: 0,
          totalInKindItems: 0,
          totalInKindRemaining: 0,
          totalDonations: 0,
          activeDonationsCount: 0
        }
      })
    }

    const placeholders = donationIds.map((_, i) => `$${i + 1}`).join(', ')

    // Fetch items, distributions (limited to 5 per donation), and distribution counts in parallel
    const [itemsResult, distributionsResult, distributionCountsResult] = await Promise.all([
      query(`SELECT * FROM "DonationItem" WHERE "donationId" IN (${placeholders})`, donationIds),
      // For distributions with ORDER BY and LIMIT per donation, we use a window function
      query(
        `SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY "donationId" ORDER BY "createdAt" DESC) AS rn
          FROM "DonationDistribution"
          WHERE "donationId" IN (${placeholders})
        ) sub WHERE rn <= 5`,
        donationIds
      ),
      query(
        `SELECT "donationId", COUNT("id")::int AS count FROM "DonationDistribution" WHERE "donationId" IN (${placeholders}) GROUP BY "donationId"`,
        donationIds
      )
    ])

    // Build maps for items, distributions, and counts
    const itemsMap: Record<string, unknown[]> = {}
    itemsResult.rows.forEach(item => {
      if (!itemsMap[item.donationId]) itemsMap[item.donationId] = []
      itemsMap[item.donationId].push(item)
    })

    const distributionsMap: Record<string, unknown[]> = {}
    distributionsResult.rows.forEach(dist => {
      if (!distributionsMap[dist.donationId]) distributionsMap[dist.donationId] = []
      distributionsMap[dist.donationId].push(dist)
    })

    const distributionCountsMap: Record<string, number> = {}
    distributionCountsResult.rows.forEach(r => { distributionCountsMap[r.donationId] = r.count })

    // Assemble donations with related data
    const donations = donationsResult.rows.map(d => ({
      ...d,
      donor: d.donorId_col ? { id: d.donorId_col, name: d.donorName, email: d.donorEmail, phone: d.donorPhone } : null,
      event: d.eventId_col ? { id: d.eventId_col, name: d.eventName } : null,
      items: itemsMap[d.id] || [],
      distributions: distributionsMap[d.id] || [],
      _count: {
        distributions: distributionCountsMap[d.id] || 0
      },
      donorId_col: undefined,
      donorName: undefined,
      donorEmail: undefined,
      donorPhone: undefined,
      eventId_col: undefined,
      eventName: undefined
    }))

    // Calculate accurate totals across ALL verified/released donations
    const monetaryDonations = donations.filter(d => d.type === 'monetary')
    const totalMonetaryDonated = monetaryDonations.reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.amount) || 0), 0)
    const totalMonetaryRemaining = monetaryDonations.reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.remainingAmount) || 0), 0)
    const totalMonetaryDistributed = totalMonetaryDonated - totalMonetaryRemaining

    // In-kind totals
    const inKindDonations = donations.filter(d => d.type === 'in-kind')
    const totalInKindItems = inKindDonations.reduce((sum: number, d: Record<string, unknown>) => {
      const itemsDistributed = ((d.items as Record<string, unknown>[]) || []).reduce((s: number, item: Record<string, unknown>) => s + (Number(item.quantity) - (Number(item.remainingQuantity) || Number(item.quantity))), 0)
      return sum + itemsDistributed
    }, 0)
    const totalInKindRemaining = inKindDonations.reduce((sum: number, d: Record<string, unknown>) => {
      const itemsRemaining = ((d.items as Record<string, unknown>[]) || []).reduce((s: number, item: Record<string, unknown>) => s + (Number(item.remainingQuantity) || Number(item.quantity)), 0)
      return sum + itemsRemaining
    }, 0)

    // Active donations (still have remaining amounts)
    const activeDonations = donations.filter(d => {
      if (d.type === 'monetary') return (Number(d.remainingAmount) || 0) > 0
      return ((d.items as Record<string, unknown>[]) || []).some(item => (Number(item.remainingQuantity) || 0) > 0)
    })

    return NextResponse.json({
      donations,
      activeDonations: activeDonations.map(d => d.id),
      summary: {
        totalMonetaryDonated,
        totalMonetaryDistributed,
        totalMonetaryRemaining,
        totalInKindItems,
        totalInKindRemaining,
        totalDonations: donations.length,
        activeDonationsCount: activeDonations.length
      }
    })
  } catch (error) {
    console.error('Get verified donations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
