import { NextRequest, NextResponse } from 'next/server'
import { query, transaction, generateId } from '@/lib/db'

// Contact/Messages API - using raw PostgreSQL via pg
// This endpoint handles the messaging system

// GET - List all messages (for admin) or user's own messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const senderId = searchParams.get('senderId')
    const status = searchParams.get('status')

    if (id) {
      const result = await query(
        `SELECT * FROM "Message" WHERE "id" = $1`,
        [id]
      )
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }
      return NextResponse.json({ message: result.rows[0] })
    }

    // Build WHERE dynamically
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (senderId) {
      conditions.push(`"senderId" = $${paramIdx++}`)
      params.push(senderId)
    }
    if (status) {
      conditions.push(`"status" = $${paramIdx++}`)
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM "Message" ${whereClause} ORDER BY "createdAt" DESC LIMIT 100`,
      params
    )

    return NextResponse.json({ messages: result.rows })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new message (contact form)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { senderId, senderType, senderName, senderEmail, subject, message } = body

    if (!senderId || !senderType || !senderName || !senderEmail || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the message and notifications in a transaction
    const newMessage = await transaction(async (client) => {
      const msgId = generateId()
      const msgResult = await client.query(
        `INSERT INTO "Message" ("id", "senderId", "senderType", "senderName", "senderEmail", "subject", "message", "status", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'unread', NOW())
         RETURNING *`,
        [msgId, senderId, senderType, senderName, senderEmail, subject, message]
      )
      const createdMessage = msgResult.rows[0]

      // Create notification for admin
      try {
        const adminNotifId = generateId()
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "title", "message", "type", "read", "createdAt")
           VALUES ($1, 'admin', 'admin', 'New Message', $2, 'info', false, NOW())`,
          [adminNotifId, `${senderName} sent a message: "${subject}"`]
        )
      } catch (e) {
        console.error('Failed to create admin notification:', e)
      }

      // Create notification for sender
      try {
        const senderNotifId = generateId()
        const donorId = senderType === 'donor' ? senderId : null
        const volunteerId = senderType === 'volunteer' ? senderId : null
        await client.query(
          `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "volunteerId", "title", "message", "type", "read", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 'Message Sent', 'Your message has been sent successfully. We''ll respond soon!', 'success', false, NOW())`,
          [senderNotifId, senderId, senderType, donorId, volunteerId]
        )
      } catch (e) {
        console.error('Failed to create sender notification:', e)
      }

      return createdMessage
    })

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update message (mark as read or reply)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, reply, repliedBy } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 })
    }

    // Check if message exists
    const existingResult = await query(
      `SELECT * FROM "Message" WHERE "id" = $1`,
      [id]
    )
    if (!existingResult.rows[0]) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    const existingMessage = existingResult.rows[0]

    if (reply !== undefined) {
      // Reply to message — use transaction for update + notification
      await transaction(async (client) => {
        await client.query(
          `UPDATE "Message" SET "reply" = $1, "repliedAt" = NOW(), "repliedBy" = $2, "status" = 'replied' WHERE "id" = $3`,
          [reply, repliedBy || 'admin', id]
        )

        // Notify sender about the reply
        try {
          const notifId = generateId()
          const donorId = existingMessage.senderType === 'donor' ? existingMessage.senderId : null
          const volunteerId = existingMessage.senderType === 'volunteer' ? existingMessage.senderId : null
          await client.query(
            `INSERT INTO "Notification" ("id", "userId", "userType", "donorId", "volunteerId", "title", "message", "type", "read", "createdAt")
             VALUES ($1, $2, $3, $4, $5, 'Message Reply', 'Admin replied to your message', 'success', false, NOW())`,
            [notifId, existingMessage.senderId, existingMessage.senderType, donorId, volunteerId]
          )
        } catch (e) {
          console.error('Failed to create reply notification:', e)
        }
      })
    } else if (status) {
      // Update message status (e.g., mark as read)
      await query(
        `UPDATE "Message" SET "status" = $1 WHERE "id" = $2`,
        [status, id]
      )
    }

    const updatedResult = await query(
      `SELECT * FROM "Message" WHERE "id" = $1`,
      [id]
    )
    return NextResponse.json({ message: updatedResult.rows[0] })
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 })
    }

    // Check if message exists
    const existingResult = await query(
      `SELECT * FROM "Message" WHERE "id" = $1`,
      [id]
    )
    if (!existingResult.rows[0]) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    await query(
      `DELETE FROM "Message" WHERE "id" = $1`,
      [id]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
