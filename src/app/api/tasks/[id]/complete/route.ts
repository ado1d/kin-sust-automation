import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { enrichTask } from '@/lib/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { proofPath, notes } = body

    // Check if task exists and is assigned
    const taskResult = await query(
      `SELECT t.*, d."type" AS "donationType"
       FROM "Task" t
       LEFT JOIN "Donation" d ON t."donationId" = d."id"
       WHERE t."id" = $1`,
      [id],
    )
    const task = taskResult.rows[0]

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'Assigned') {
      return NextResponse.json({ error: 'Task must be assigned before completion' }, { status: 400 })
    }

    // Update task to completed
    const updateResult = await query(
      `UPDATE "Task" SET "status" = $1, "proofPath" = $2, "notes" = $3, "updatedAt" = NOW() WHERE "id" = $4 RETURNING *`,
      ['Completed', proofPath || null, notes || task.notes, id],
    )

    const enrichedTask = await enrichTask(updateResult.rows[0])
    return NextResponse.json({ task: enrichedTask })
  } catch (error) {
    console.error('Complete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
