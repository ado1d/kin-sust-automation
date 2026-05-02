import { NextRequest, NextResponse } from 'next/server'
import { query, generateId, transaction } from '@/lib/db'
import { enrichTask, enrichTasks } from '@/lib/helpers'

// GET - List all tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const volunteerId = searchParams.get('volunteerId')
    const status = searchParams.get('status')

    if (id) {
      const result = await query('SELECT * FROM "Task" WHERE "id" = $1', [id])
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      const task = await enrichTask(result.rows[0])
      return NextResponse.json({ task })
    }

    // Build dynamic WHERE clause
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (volunteerId) {
      conditions.push(`"volunteerId" = $${paramIdx++}`)
      params.push(volunteerId)
    }
    if (status) {
      conditions.push(`"status" = $${paramIdx++}`)
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await query(
      `SELECT * FROM "Task" ${whereClause} ORDER BY "createdAt" DESC`,
      params,
    )

    const tasks = await enrichTasks(result.rows)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donationId, volunteerId, pickupAddress, pickupLat, pickupLng, pickupTime, priority, notes } = body

    if (!donationId || !pickupAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = generateId()
    const taskStatus = volunteerId ? 'Assigned' : 'Open'

    const taskRow = await transaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO "Task" ("id", "donationId", "volunteerId", "pickupAddress", "pickupLat", "pickupLng", "pickupTime", "priority", "notes", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          id,
          donationId,
          volunteerId || null,
          pickupAddress,
          pickupLat || null,
          pickupLng || null,
          pickupTime || null,
          priority || 'Normal',
          notes || null,
          taskStatus,
        ],
      )

      // Notify volunteer if assigned
      if (volunteerId) {
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "volunteerId", "title", "message", "type", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            generateId(),
            volunteerId,
            'volunteer',
            volunteerId,
            'New Task Assigned',
            `You have been assigned a pickup task at ${pickupAddress}.`,
            'info',
          ],
        )
      }

      // Get donor name for admin notification
      const donorResult = await client.query(
        `SELECT dr."name" FROM "Donation" d JOIN "Donor" dr ON d."donorId" = dr."id" WHERE d."id" = $1`,
        [donationId],
      )
      const donorName = donorResult.rows[0]?.name || 'Unknown'

      // Notify admin about new task
      await client.query(
        `INSERT INTO "Notification" ("id", "userId", "userType", "title", "message", "type", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          generateId(),
          'admin',
          'admin',
          'New Pickup Task Created',
          `A new pickup task has been created for donation from ${donorName}.`,
          'info',
        ],
      )

      return insertResult.rows[0]
    })

    // Enrich the task for the response (reads after commit)
    const task = await enrichTask(taskRow)
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }

    // Get the original task (with volunteer name for notification)
    const originalResult = await query(
      `SELECT t.*, v."name" AS "volunteerName"
       FROM "Task" t
       LEFT JOIN "Volunteer" v ON t."volunteerId" = v."id"
       WHERE t."id" = $1`,
      [id],
    )
    const originalTask = originalResult.rows[0]

    if (!originalTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Build dynamic SET clause
    const updates: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (data.status) {
      updates.push(`"status" = $${paramIdx++}`)
      params.push(data.status)
    }
    if (data.volunteerId !== undefined) {
      updates.push(`"volunteerId" = $${paramIdx++}`)
      params.push(data.volunteerId || null)
    }
    if (data.pickupAddress) {
      updates.push(`"pickupAddress" = $${paramIdx++}`)
      params.push(data.pickupAddress)
    }
    if (data.pickupTime !== undefined) {
      updates.push(`"pickupTime" = $${paramIdx++}`)
      params.push(data.pickupTime || null)
    }
    if (data.priority) {
      updates.push(`"priority" = $${paramIdx++}`)
      params.push(data.priority)
    }
    if (data.notes !== undefined) {
      updates.push(`"notes" = $${paramIdx++}`)
      params.push(data.notes || null)
    }
    // Handle both proofPath and proofDocument field names
    if (data.proofPath !== undefined) {
      updates.push(`"proofPath" = $${paramIdx++}`)
      params.push(data.proofPath || null)
    }
    if (data.proofDocument !== undefined) {
      updates.push(`"proofPath" = $${paramIdx++}`)
      params.push(data.proofDocument || null)
    }

    // Auto-update status when volunteer is assigned
    if (data.volunteerId && !data.status) {
      updates.push(`"status" = $${paramIdx++}`)
      params.push('Assigned')
    }

    updates.push(`"updatedAt" = NOW()`)

    // Add WHERE parameter
    params.push(id)

    const taskRow = await transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE "Task" SET ${updates.join(', ')} WHERE "id" = $${paramIdx} RETURNING *`,
        params,
      )
      const task = updateResult.rows[0]

      // Notify volunteer if newly assigned
      if (data.volunteerId && data.volunteerId !== originalTask.volunteerId) {
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "volunteerId", "title", "message", "type", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            generateId(),
            data.volunteerId,
            'volunteer',
            data.volunteerId,
            'New Task Assigned',
            `You have been assigned a pickup task at ${task.pickupAddress}.`,
            'info',
          ],
        )
      }

      // Notify admin when task is completed
      if (data.status === 'Completed' && originalTask.status !== 'Completed') {
        const volunteerName = task.volunteerId
          ? (await client.query('SELECT "name" FROM "Volunteer" WHERE "id" = $1', [task.volunteerId])).rows[0]?.name
          : originalTask.volunteerName
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "title", "message", "type", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            generateId(),
            'admin',
            'admin',
            'Task Completed',
            `Volunteer ${volunteerName || 'Unknown'} has completed the pickup task. Please review and verify.`,
            'success',
          ],
        )
      }

      // Notify donor when task is verified
      if (data.status === 'Verified' && originalTask.status !== 'Verified') {
        const donationResult = await client.query(
          'SELECT "donorId" FROM "Donation" WHERE "id" = $1',
          [task.donationId],
        )
        const donorId = donationResult.rows[0]?.donorId
        if (donorId) {
          await client.query(
            `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "title", "message", "type", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              generateId(),
              donorId,
              'donor',
              donorId,
              'Donation Verified',
              'Your donation has been verified and processed successfully.',
              'success',
            ],
          )
        }
      }

      return task
    })

    // Enrich for response
    const task = await enrichTask(taskRow)
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }

    await query('DELETE FROM "Task" WHERE "id" = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
