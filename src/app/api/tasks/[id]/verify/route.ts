import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'
import { enrichTask } from '@/lib/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Check if task exists and is completed
    const taskResult = await query('SELECT * FROM "Task" WHERE "id" = $1', [id])
    const task = taskResult.rows[0]

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'Completed') {
      return NextResponse.json({ error: 'Task must be completed before verification' }, { status: 400 })
    }

    // Get the related donation to check type and payment method
    const donationResult = await query('SELECT * FROM "Donation" WHERE "id" = $1', [task.donationId])
    const donation = donationResult.rows[0]

    // Update task to verified and sync donation status atomically
    const taskRow = await transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE "Task" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
        ['Verified', id],
      )

      // For cash pickup tasks, update the donation payment status
      if (donation) {
        if (donation.type === 'monetary' && donation.paymentMethod === 'cash') {
          await client.query(
            `UPDATE "Donation" SET "paymentStatus" = $1, "status" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
            ['Paid', 'Verified', donation.id],
          )
        } else if (donation.type === 'in-kind') {
          // For in-kind donations, mark as verified after task verification
          await client.query(
            `UPDATE "Donation" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            ['Verified', donation.id],
          )
        }
      }

      return updateResult.rows[0]
    })

    const enrichedTask = await enrichTask(taskRow)
    return NextResponse.json({ task: enrichedTask })
  } catch (error) {
    console.error('Verify task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
