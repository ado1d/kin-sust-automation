import { NextRequest, NextResponse } from 'next/server'
import { query, generateId } from '@/lib/db'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, ...data } = body

    if (!role || !data.email || !data.password || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hashedPassword = simpleHash(data.password)

    if (role === 'donor') {
      // Check if donor exists
      const existingResult = await query('SELECT * FROM "Donor" WHERE "email" = $1', [data.email])
      if (existingResult.rows[0]) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }

      const id = generateId()
      const result = await query(
        `INSERT INTO "Donor" ("id", "name", "email", "password", "phone", "address", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, data.name, data.email, hashedPassword, data.phone || null, data.address || null, 'Active']
      )
      const donor = result.rows[0]

      return NextResponse.json({ 
        success: true, 
        user: { id: donor.id, email: donor.email, name: donor.name } 
      })
    }

    if (role === 'volunteer') {
      // Check if volunteer exists
      const existingResult = await query('SELECT * FROM "Volunteer" WHERE "email" = $1', [data.email])
      if (existingResult.rows[0]) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }

      const id = generateId()
      const result = await query(
        `INSERT INTO "Volunteer" ("id", "name", "email", "password", "phone", "fatherName", "motherName", "address", "institution", "session", "regNo", "department", "dateOfBirth", "bloodGroup", "activities", "skills", "photo", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          id, data.name, data.email, hashedPassword,
          data.phone || null, data.fatherName || null, data.motherName || null,
          data.address || null, data.institution || null, data.session || null,
          data.regNo || null, data.department || null, data.dateOfBirth || null,
          data.bloodGroup || null, data.activities || null, data.skills || null,
          data.photo || null, 'Pending'
        ]
      )
      const volunteer = result.rows[0]

      return NextResponse.json({ 
        success: true, 
        user: { id: volunteer.id, email: volunteer.email, name: volunteer.name },
        message: 'Registration successful. Please wait for admin approval.'
      })
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
