import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// Simple hash function for passwords
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// GET - List all volunteers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      // Fetch volunteer by ID
      const volunteerResult = await query('SELECT * FROM "Volunteer" WHERE "id" = $1', [id])
      if (volunteerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 })
      }
      const volunteer = volunteerResult.rows[0]

      // Fetch tasks for this volunteer (latest 10)
      const tasksResult = await query(
        'SELECT * FROM "Task" WHERE "volunteerId" = $1 ORDER BY "createdAt" DESC LIMIT 10',
        [id]
      )
      const tasks = tasksResult.rows

      // Fetch task count
      const countResult = await query(
        'SELECT COUNT(*)::int AS count FROM "Task" WHERE "volunteerId" = $1',
        [id]
      )
      const taskCount = countResult.rows[0].count

      // Collect donation IDs from tasks
      const donationIds = tasks.filter(t => t.donationId).map(t => t.donationId)

      // Fetch donations and donors for those donations
      let donationsMap: Record<string, any> = {}
      let donorsMap: Record<string, any> = {}

      if (donationIds.length > 0) {
        const [donationsResult, donorsResult] = await Promise.all([
          query('SELECT * FROM "Donation" WHERE "id" = ANY($1)', [donationIds]),
          query(
            `SELECT DISTINCT dn.* FROM "Donor" dn
             INNER JOIN "Donation" d ON d."donorId" = dn."id"
             WHERE d."id" = ANY($1)`,
            [donationIds]
          )
        ])

        for (const d of donationsResult.rows) {
          donationsMap[d.id] = { ...d }
        }
        for (const dn of donorsResult.rows) {
          donorsMap[dn.id] = dn
        }
      }

      // Assemble: attach donor to donation, donation to task
      for (const donation of Object.values(donationsMap) as any[]) {
        if (donation.donorId && donorsMap[donation.donorId]) {
          donation.donor = donorsMap[donation.donorId]
        }
      }
      for (const task of tasks) {
        if (task.donationId && donationsMap[task.donationId]) {
          task.donation = donationsMap[task.donationId]
        }
      }

      volunteer.tasks = tasks
      volunteer._count = { tasks: taskCount }

      // Remove password from response
      delete volunteer.password

      return NextResponse.json({ volunteer })
    }

    // List all volunteers with task count
    const volunteersResult = await query(
      `SELECT v.*,
        (SELECT COUNT(*)::int FROM "Task" WHERE "volunteerId" = v."id") AS "_count_tasks"
       FROM "Volunteer" v
       WHERE ($1::text IS NULL OR v."status" = $1)
       ORDER BY v."createdAt" DESC`,
      [status]
    )

    const volunteers = volunteersResult.rows.map(v => {
      const { _count_tasks, ...rest } = v
      delete rest.password
      return { ...rest, _count: { tasks: _count_tasks } }
    })

    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error('Get volunteers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new volunteer (by admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password, ...data } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for existing email
    const existingResult = await query('SELECT "id" FROM "Volunteer" WHERE "email" = $1', [email])
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Create volunteer and notification in a transaction
    const volunteer = await transaction(async (client) => {
      const volunteerId = generateId()
      const volunteerResult = await client.query(
        `INSERT INTO "Volunteer" ("id", "name", "email", "phone", "password", "fatherName", "motherName", "address", "institution", "session", "regNo", "department", "dateOfBirth", "bloodGroup", "activities", "skills", "photo", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
         RETURNING *`,
        [
          volunteerId,
          name,
          email,
          phone || null,
          simpleHash(password),
          data.fatherName || null,
          data.motherName || null,
          data.address || null,
          data.institution || null,
          data.session || null,
          data.regNo || null,
          data.department || null,
          data.dateOfBirth || null,
          data.bloodGroup || null,
          data.activities || null,
          data.skills || null,
          data.photo || null,
          data.status || 'Pending',
        ]
      )
      const newVolunteer = volunteerResult.rows[0]

      // Notify admin about new volunteer registration
      const notificationId = generateId()
      await client.query(
        `INSERT INTO "Notification" ("id", "userId", "userType", "title", "message", "type", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          notificationId,
          'admin',
          'admin',
          'New Volunteer Registration',
          `${name} has registered as a volunteer. Please review and approve.`,
          'info'
        ]
      )

      return newVolunteer
    })

    // Remove password from response
    delete volunteer.password

    return NextResponse.json({ volunteer })
  } catch (error) {
    console.error('Create volunteer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update volunteer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing volunteer ID' }, { status: 400 })
    }

    // Get original volunteer data for status change detection
    const origResult = await query('SELECT * FROM "Volunteer" WHERE "id" = $1', [id])
    if (origResult.rows.length === 0) {
      return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 })
    }
    const originalVolunteer = origResult.rows[0]

    // Verify current password if changing password
    if (data.password && data.currentPassword) {
      if (originalVolunteer.password !== simpleHash(data.currentPassword)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    // Build SET clause dynamically
    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    const simpleFields = ['name', 'phone', 'fatherName', 'motherName', 'address', 'institution', 'session', 'regNo', 'department', 'dateOfBirth', 'bloodGroup', 'donatedBlood', 'photo', 'status']

    for (const field of simpleFields) {
      if (data[field] !== undefined) {
        setClauses.push(`"${field}" = $${paramIndex++}`)
        params.push(data[field] || null)
      }
    }

    // Handle activities (JSON array or comma-separated string)
    if (data.activities !== undefined) {
      let activitiesValue: unknown = data.activities || null
      if (typeof data.activities === 'string' && data.activities.includes(',')) {
        activitiesValue = data.activities
      } else if (Array.isArray(data.activities)) {
        activitiesValue = JSON.stringify(data.activities)
      }
      setClauses.push(`"activities" = $${paramIndex++}`)
      params.push(activitiesValue)
    }

    // Handle skills (JSON array or comma-separated string)
    if (data.skills !== undefined) {
      let skillsValue: unknown = data.skills || null
      if (typeof data.skills === 'string' && data.skills.includes(',')) {
        skillsValue = data.skills
      } else if (Array.isArray(data.skills)) {
        skillsValue = JSON.stringify(data.skills)
      }
      setClauses.push(`"skills" = $${paramIndex++}`)
      params.push(skillsValue)
    }

    // Handle password change
    if (data.password) {
      setClauses.push(`"password" = $${paramIndex++}`)
      params.push(simpleHash(data.password))
    }

    if (setClauses.length > 0) {
      setClauses.push(`"updatedAt" = NOW()`)
    }

    params.push(id) // for WHERE clause

    // Update volunteer and conditionally create notification in a transaction
    const volunteer = await transaction(async (client) => {
      let updatedVolunteer = originalVolunteer

      if (setClauses.length > 0) {
        const updateResult = await client.query(
          `UPDATE "Volunteer" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`,
          params
        )
        updatedVolunteer = updateResult.rows[0]
      }

      // Notify volunteer when status changes
      if (data.status && data.status !== originalVolunteer.status) {
        const notificationType = data.status === 'Active' ? 'success' : data.status === 'Rejected' ? 'error' : 'info'
        const notificationId = generateId()
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "volunteerId", "title", "message", "type", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            notificationId,
            id,
            'volunteer',
            id,
            `Account ${data.status}`,
            data.status === 'Active'
              ? 'Congratulations! Your volunteer account has been approved.'
              : data.status === 'Rejected'
              ? 'Your volunteer application has been rejected.'
              : `Your account status has been updated to ${data.status}.`,
            notificationType
          ]
        )
      }

      return updatedVolunteer
    })

    // Remove password from response
    delete volunteer.password

    return NextResponse.json({ volunteer })
  } catch (error) {
    console.error('Update volunteer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete volunteer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing volunteer ID' }, { status: 400 })
    }

    await query('DELETE FROM "Volunteer" WHERE "id" = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete volunteer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
