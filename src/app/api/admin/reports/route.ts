import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Total monetary donations (verified)
    const monetaryTotalResult = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS "totalAmount" FROM "Donation" WHERE "type" = 'monetary' AND "status" = 'Verified'`
    )
    const totalMonetary = Number(monetaryTotalResult.rows[0]?.totalAmount ?? 0)

    // Total in-kind items
    const totalItemsResult = await query(
      `SELECT COALESCE(SUM("quantity"), 0) AS "totalQuantity" FROM "DonationItem"`
    )
    const totalItems = Number(totalItemsResult.rows[0]?.totalQuantity ?? 0)

    // Remaining items
    const remainingItemsResult = await query(
      `SELECT COALESCE(SUM("remainingQuantity"), 0) AS "totalRemaining" FROM "DonationItem"`
    )
    const remainingItems = Number(remainingItemsResult.rows[0]?.totalRemaining ?? 0)

    // Monetary donations by event/drive
    const monetaryByEventResult = await query(
      `SELECT "eventId", SUM("amount") AS "totalAmount", COUNT("id") AS "donationCount"
       FROM "Donation" WHERE "type" = 'monetary' AND "status" = 'Verified'
       GROUP BY "eventId"`
    )

    // Get event names for monetary donations
    const monetaryEventIds = monetaryByEventResult.rows.map((r: any) => r.eventId).filter(Boolean)
    let monetaryEventMap = new Map<string, string>()
    if (monetaryEventIds.length > 0) {
      const monetaryEventsResult = await query(
        `SELECT "id", "name" FROM "Event" WHERE "id" = ANY($1)`,
        [monetaryEventIds]
      )
      for (const e of monetaryEventsResult.rows) {
        monetaryEventMap.set(e.id, e.name)
      }
    }

    const monetaryByEvent = monetaryByEventResult.rows.map((m: any) => ({
      eventId: m.eventId,
      eventName: m.eventId ? monetaryEventMap.get(m.eventId) || 'Unknown' : 'General Donations',
      amount: Number(m.totalAmount ?? 0),
      count: Number(m.donationCount ?? 0)
    }))

    // In-kind donations by event/drive
    const inKindByEventResult = await query(
      `SELECT "eventId", SUM("amount") AS "totalAmount", COUNT("id") AS "donationCount"
       FROM "Donation" WHERE "type" = 'in-kind'
       GROUP BY "eventId"`
    )

    // Get event names for in-kind donations
    const inKindEventIds = inKindByEventResult.rows.map((r: any) => r.eventId).filter(Boolean)
    let inKindEventMap = new Map<string, string>()
    if (inKindEventIds.length > 0) {
      const inKindEventsResult = await query(
        `SELECT "id", "name" FROM "Event" WHERE "id" = ANY($1)`,
        [inKindEventIds]
      )
      for (const e of inKindEventsResult.rows) {
        inKindEventMap.set(e.id, e.name)
      }
    }

    // Get item counts per event for in-kind donations
    // Sum donation item quantities grouped by the donation's eventId
    const itemsByEventResult = await query(
      `SELECT d."eventId", SUM(di."quantity") AS "totalItemQuantity"
       FROM "DonationItem" di
       JOIN "Donation" d ON di."donationId" = d.id
       WHERE d."type" = 'in-kind'
       GROUP BY d."eventId"`
    )
    const eventItemTotals: Record<string, number> = {}
    for (const r of itemsByEventResult.rows) {
      const key = r.eventId || 'general'
      eventItemTotals[key] = Number(r.totalItemQuantity ?? 0)
    }

    const inKindByEvent = inKindByEventResult.rows.map((m: any) => ({
      eventId: m.eventId,
      eventName: m.eventId ? inKindEventMap.get(m.eventId) || 'Unknown' : 'General Donations',
      itemCount: eventItemTotals[m.eventId || 'general'] || 0,
      count: Number(m.donationCount ?? 0)
    }))

    // Remaining items by category
    const remainingByCategoryResult = await query(
      `SELECT "category", COALESCE(SUM("remainingQuantity"), 0) AS "totalRemaining"
       FROM "DonationItem"
       GROUP BY "category"`
    )
    const remainingByCategory = remainingByCategoryResult.rows.map((r: any) => ({
      category: r.category,
      quantity: Number(r.totalRemaining ?? 0)
    }))

    return NextResponse.json({
      totalMonetary,
      totalItems,
      remainingItems,
      remainingByCategory,
      monetaryByEvent,
      inKindByEvent
    })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
