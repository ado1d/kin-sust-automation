import { NextRequest, NextResponse } from 'next/server'
import { transaction, generateId } from '@/lib/db'

// POST /api/distributions/bulk - Bulk distribute from all verified donations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, eventId, beneficiary, notes, proofPath, itemDistributions } = body

    // type: 'monetary' or 'in-kind'
    if (!type || !['monetary', 'in-kind'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "monetary" or "in-kind"' }, { status: 400 })
    }

    const result = await transaction(async (client) => {
      if (type === 'monetary') {
        // Get all verified monetary donations with remaining amounts
        let monetaryQuery: string
        let monetaryParams: unknown[]

        if (eventId) {
          monetaryQuery = `SELECT * FROM "Donation" WHERE "type" = 'monetary' AND "status" = 'Verified' AND "remainingAmount" > 0 AND "eventId" = $1 ORDER BY "createdAt" ASC`
          monetaryParams = [eventId]
        } else {
          monetaryQuery = `SELECT * FROM "Donation" WHERE "type" = 'monetary' AND "status" = 'Verified' AND "remainingAmount" > 0 ORDER BY "createdAt" ASC`
          monetaryParams = []
        }

        const donationsResult = await client.query(monetaryQuery, monetaryParams)
        const donations = donationsResult.rows

        if (donations.length === 0) {
          throw new Error('NO_DONATIONS')
        }

        if (!amount || amount <= 0) {
          throw new Error('INVALID_AMOUNT')
        }

        const totalAvailable = donations.reduce((sum: number, d: any) => sum + (d.remainingAmount ?? 0), 0)
        if (amount > totalAvailable) {
          throw new Error(`EXCEEDS_AVAILABLE:${totalAvailable}`)
        }

        let remainingToDistribute = amount
        const createdDistributions: any[] = []

        for (const donation of donations) {
          if (remainingToDistribute <= 0) break

          const currentRemaining = donation.remainingAmount ?? 0
          if (currentRemaining <= 0) continue

          const distributeFromThis = Math.min(remainingToDistribute, currentRemaining)

          // Create distribution record
          const distId = generateId()
          const distResult = await client.query(
            `INSERT INTO "DonationDistribution" ("id", "donationId", "eventId", "amount", "proofPath", "beneficiary", "notes", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [distId, donation.id, eventId || null, distributeFromThis, proofPath || null, beneficiary || null, notes || null]
          )

          // Update remaining amount
          const newRemaining = currentRemaining - distributeFromThis
          const newStatus = newRemaining <= 0 ? 'Released' : 'Verified'

          await client.query(
            `UPDATE "Donation" SET "remainingAmount" = $1, "status" = $2 WHERE "id" = $3`,
            [newRemaining, newStatus, donation.id]
          )

          createdDistributions.push({
            donationId: donation.id,
            distributionId: distResult.rows[0].id,
            amount: distributeFromThis,
            donorName: 'Donor'
          })

          remainingToDistribute -= distributeFromThis
        }

        return { distributions: createdDistributions, count: createdDistributions.length }

      } else {
        // In-kind bulk distribution
        // itemDistributions: array of { itemName, quantity }
        if (!itemDistributions || !Array.isArray(itemDistributions) || itemDistributions.length === 0) {
          throw new Error('NO_ITEMS')
        }

        // Get all verified in-kind donations that have items with remaining quantity
        let inKindQuery: string
        let inKindParams: unknown[]

        if (eventId) {
          inKindQuery = `
            SELECT d.* FROM "Donation" d
            WHERE d."type" = 'in-kind' AND d."status" = 'Verified' AND d."eventId" = $1
            AND EXISTS (
              SELECT 1 FROM "DonationItem" di WHERE di."donationId" = d.id AND di."remainingQuantity" > 0
            )
            ORDER BY d."createdAt" ASC`
          inKindParams = [eventId]
        } else {
          inKindQuery = `
            SELECT d.* FROM "Donation" d
            WHERE d."type" = 'in-kind' AND d."status" = 'Verified'
            AND EXISTS (
              SELECT 1 FROM "DonationItem" di WHERE di."donationId" = d.id AND di."remainingQuantity" > 0
            )
            ORDER BY d."createdAt" ASC`
          inKindParams = []
        }

        const donationsResult = await client.query(inKindQuery, inKindParams)
        const donations = donationsResult.rows

        if (donations.length === 0) {
          throw new Error('NO_DONATIONS')
        }

        // Fetch items for all these donations
        const donationIds = donations.map((d: any) => d.id)
        const itemsResult = await client.query(
          `SELECT * FROM "DonationItem" WHERE "donationId" = ANY($1)`,
          [donationIds]
        )

        // Attach items to donations
        const donationMap = new Map<string, any>()
        for (const d of donations) {
          donationMap.set(d.id, { ...d, items: [] })
        }
        for (const item of itemsResult.rows) {
          const donation = donationMap.get(item.donationId)
          if (donation) {
            donation.items.push(item)
          }
        }

        const createdDistributions: any[] = []

        for (const itemDist of itemDistributions) {
          if (!itemDist.itemName || !itemDist.quantity || itemDist.quantity <= 0) continue

          let remainingToDistribute = itemDist.quantity

          // Find donations that have this item with remaining quantity
          const matchingDonations = donations.filter((d: any) => {
            const donation = donationMap.get(d.id)
            return donation && donation.items.some((item: any) =>
              item.itemName.toLowerCase() === itemDist.itemName.toLowerCase() &&
              (item.remainingQuantity ?? 0) > 0
            )
          })

          for (const donation of matchingDonations) {
            if (remainingToDistribute <= 0) break

            const donationWithItems = donationMap.get(donation.id)
            const item = donationWithItems.items.find((i: any) =>
              i.itemName.toLowerCase() === itemDist.itemName.toLowerCase() &&
              (i.remainingQuantity ?? 0) > 0
            )
            if (!item) continue

            const currentRemaining = item.remainingQuantity ?? 0
            const distributeFromThis = Math.min(remainingToDistribute, currentRemaining)

            const distId = generateId()
            const distResult = await client.query(
              `INSERT INTO "DonationDistribution" ("id", "donationId", "eventId", "itemName", "quantity", "proofPath", "beneficiary", "notes", "createdAt")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               RETURNING *`,
              [distId, donation.id, eventId || null, item.itemName, distributeFromThis, proofPath || null, beneficiary || null, notes || null]
            )

            const newRemaining = currentRemaining - distributeFromThis
            await client.query(
              `UPDATE "DonationItem" SET "remainingQuantity" = $1 WHERE "id" = $2`,
              [newRemaining, item.id]
            )

            // Update in-memory item for subsequent iterations
            item.remainingQuantity = newRemaining

            // Check if all items in this donation are fully distributed
            const allItemsResult = await client.query(
              `SELECT * FROM "DonationItem" WHERE "donationId" = $1`,
              [donation.id]
            )
            const allDistributed = allItemsResult.rows.every((i: any) => i.remainingQuantity === 0)

            if (allDistributed) {
              await client.query(
                `UPDATE "Donation" SET "status" = 'Released' WHERE "id" = $1`,
                [donation.id]
              )
            }

            createdDistributions.push({
              donationId: donation.id,
              distributionId: distResult.rows[0].id,
              itemName: item.itemName,
              quantity: distributeFromThis
            })

            remainingToDistribute -= distributeFromThis
          }
        }

        return { distributions: createdDistributions, count: createdDistributions.length }
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Bulk distribution error:', error)

    // Handle custom errors thrown from transaction
    if (error?.message === 'NO_DONATIONS') {
      return NextResponse.json({ error: 'No verified donations available for distribution' }, { status: 400 })
    }
    if (error?.message === 'INVALID_AMOUNT') {
      return NextResponse.json({ error: 'Valid amount is required for monetary bulk distribution' }, { status: 400 })
    }
    if (error?.message?.startsWith('EXCEEDS_AVAILABLE:')) {
      const totalAvailable = error.message.split(':')[1]
      return NextResponse.json({
        error: `Cannot distribute more than total available (৳${Number(totalAvailable).toLocaleString()})`
      }, { status: 400 })
    }
    if (error?.message === 'NO_ITEMS') {
      return NextResponse.json({ error: 'Item distributions are required for in-kind bulk distribution' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
