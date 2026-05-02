import { NextRequest, NextResponse } from 'next/server'
import { query, generateId } from '@/lib/db'

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType') // 'donor', 'volunteer', 'admin'
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId || !userType) {
      return NextResponse.json({ error: 'Missing userId or userType' }, { status: 400 })
    }

    // Build WHERE conditions dynamically
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (userType === 'donor') {
      conditions.push(`"donorId" = $${paramIdx++}`)
      params.push(userId)
    } else if (userType === 'volunteer') {
      conditions.push(`"volunteerId" = $${paramIdx++}`)
      params.push(userId)
    } else if (userType === 'admin') {
      conditions.push(`"userId" = $${paramIdx++} AND "userType" = $${paramIdx++}`)
      params.push(userId, 'admin')
    }

    const orClause = conditions.length > 0 ? `(${conditions.join(' OR ')})` : '1=0'
    const unreadCondition = unreadOnly ? ` AND "read" = false` : ''

    const notificationsResult = await query(
      `SELECT * FROM "Notification" WHERE ${orClause}${unreadCondition} ORDER BY "createdAt" DESC LIMIT 50`,
      params
    )

    // Count unread — same OR condition, always read = false
    const unreadResult = await query(
      `SELECT COUNT(*)::int AS "unreadCount" FROM "Notification" WHERE ${orClause} AND "read" = false`,
      params
    )

    const notifications = notificationsResult.rows
    const unreadCount = unreadResult.rows[0]?.unreadCount ?? 0

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, userType, title, message, type = 'info' } = data

    if (!userId || !userType || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = generateId()

    let donorId: string | null = null
    let volunteerId: string | null = null

    if (userType === 'donor') {
      donorId = userId
    } else if (userType === 'volunteer') {
      volunteerId = userId
    }

    const result = await query(
      `INSERT INTO "Notification" ("id", "title", "message", "type", "read", "userId", "userType", "donorId", "volunteerId", "createdAt")
       VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [id, title, message, type, userId, userType, donorId, volunteerId]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { notificationId, userId, userType, markAllRead } = data

    if (markAllRead && userId && userType) {
      // Mark all notifications as read for a user
      const conditions: string[] = []
      const params: unknown[] = []
      let paramIdx = 1

      if (userType === 'donor') {
        conditions.push(`"donorId" = $${paramIdx++}`)
        params.push(userId)
      } else if (userType === 'volunteer') {
        conditions.push(`"volunteerId" = $${paramIdx++}`)
        params.push(userId)
      } else if (userType === 'admin') {
        conditions.push(`"userId" = $${paramIdx++} AND "userType" = $${paramIdx++}`)
        params.push(userId, 'admin')
      }

      const orClause = conditions.length > 0 ? `(${conditions.join(' OR ')})` : '1=0'

      await query(
        `UPDATE "Notification" SET "read" = true WHERE ${orClause} AND "read" = false`,
        params
      )

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (notificationId) {
      // Mark single notification as read
      await query(
        `UPDATE "Notification" SET "read" = true WHERE "id" = $1`,
        [notificationId]
      )

      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
