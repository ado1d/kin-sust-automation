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
    const { volunteerId } = body

    if (!volunteerId) {
      return NextResponse.json({ error: 'Volunteer ID is required' }, { status: 400 })
    }

    // Check if task exists and is open
    const taskResult = await query('SELECT * FROM "Task" WHERE "id" = $1', [id])
    const task = taskResult.rows[0]

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'Open') {
      return NextResponse.json({ error: 'Task is not available for assignment' }, { status: 400 })
    }

    if (task.volunteerId) {
      return NextResponse.json({ error: 'Task is already assigned' }, { status: 400 })
    }

    // Check if volunteer is active
    const volunteerResult = await query('SELECT * FROM "Volunteer" WHERE "id" = $1', [volunteerId])
    const volunteer = volunteerResult.rows[0]

    if (!volunteer || volunteer.status !== 'Active') {
      return NextResponse.json({ error: 'Volunteer not found or not active' }, { status: 400 })
    }

    // Assign task to volunteer
    const updateResult = await query(
      `UPDATE "Task" SET "volunteerId" = $1, "status" = $2, "updatedAt" = NOW() WHERE "id" = $3 RETURNING *`,
      [volunteerId, 'Assigned', id],
    )

    const enrichedTask = await enrichTask(updateResult.rows[0])
    return NextResponse.json({ task: enrichedTask })
  } catch (error) {
    console.error('Accept task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
