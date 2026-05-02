import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, itemName, quantity, proofPath, beneficiary, notes, eventId } = body

    // Check if donation exists and is verified
    const donationResult = await query(
      `SELECT * FROM "Donation" WHERE "id" = $1`,
      [id]
    )

    if (donationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donation = donationResult.rows[0]

    if (donation.status !== 'Verified') {
      return NextResponse.json({ error: 'Only verified donations can be distributed' }, { status: 400 })
    }

    // For monetary donations
    if (donation.type === 'monetary') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Valid amount is required for monetary distribution' }, { status: 400 })
      }

      const currentRemaining = Number(donation.remainingAmount) || 0
      if (amount > currentRemaining) {
        return NextResponse.json({
          error: `Cannot distribute more than remaining amount (৳${currentRemaining})`
        }, { status: 400 })
      }

      // Create distribution record and update remaining amount in a transaction
      const result = await transaction(async (client) => {
        // Create distribution record
        const distributionId = generateId()
        const distributionResult = await client.query(
          `INSERT INTO "DonationDistribution" ("id", "donationId", "eventId", "amount", "proofPath", "beneficiary", "notes", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING *`,
          [distributionId, id, eventId || null, amount, proofPath || null, beneficiary || null, notes || null]
        )

        // Update remaining amount
        const newRemaining = currentRemaining - amount
        const newStatus = newRemaining <= 0 ? 'Released' : 'Verified'

        await client.query(
          `UPDATE "Donation" SET "remainingAmount" = $1, "status" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
          [newRemaining, newStatus, id]
        )

        return { distribution: distributionResult.rows[0], remainingAmount: newRemaining }
      })

      return NextResponse.json({ distribution: result.distribution, remainingAmount: result.remainingAmount })
    }

    // For in-kind donations
    if (donation.type === 'in-kind') {
      if (!itemName || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Item name and valid quantity are required' }, { status: 400 })
      }

      // Fetch items for this donation
      const itemsResult = await query(
        `SELECT * FROM "DonationItem" WHERE "donationId" = $1`,
        [id]
      )

      // Find the item in the donation
      const item = itemsResult.rows.find((i: Record<string, unknown>) =>
        String(i.itemName).toLowerCase() === String(itemName).toLowerCase() ||
        i.id === itemName // Allow passing item ID
      )

      if (!item) {
        return NextResponse.json({ error: 'Item not found in donation' }, { status: 400 })
      }

      const currentRemaining = Number(item.remainingQuantity)
      if (quantity > currentRemaining) {
        return NextResponse.json({
          error: `Cannot distribute more than remaining quantity (${currentRemaining})`
        }, { status: 400 })
      }

      // Create distribution record and update item/donation in a transaction
      const result = await transaction(async (client) => {
        // Create distribution record
        const distributionId = generateId()
        const distributionResult = await client.query(
          `INSERT INTO "DonationDistribution" ("id", "donationId", "eventId", "itemName", "quantity", "proofPath", "beneficiary", "notes", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [distributionId, id, eventId || null, item.itemName, quantity, proofPath || null, beneficiary || null, notes || null]
        )

        // Update remaining quantity for the item
        const newRemaining = currentRemaining - quantity
        await client.query(
          `UPDATE "DonationItem" SET "remainingQuantity" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          [newRemaining, item.id]
        )

        // Check if all items are fully distributed
        const allItemsResult = await client.query(
          `SELECT * FROM "DonationItem" WHERE "donationId" = $1`,
          [id]
        )
        const allDistributed = allItemsResult.rows.every((i: Record<string, unknown>) => Number(i.remainingQuantity) === 0)

        if (allDistributed) {
          await client.query(
            `UPDATE "Donation" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            ['Released', id]
          )
        }

        return { distribution: distributionResult.rows[0], remainingQuantity: newRemaining }
      })

      return NextResponse.json({ distribution: result.distribution, remainingQuantity: result.remainingQuantity })
    }

    return NextResponse.json({ error: 'Invalid donation type' }, { status: 400 })
  } catch (error) {
    console.error('Distribute donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
