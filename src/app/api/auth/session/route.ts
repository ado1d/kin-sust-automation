import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null })
    }

    const session = JSON.parse(sessionCookie.value)

    // If admin, return session directly
    if (session.role === 'admin') {
      return NextResponse.json({ 
        user: { 
          role: 'admin', 
          email: session.email, 
          name: 'Administrator' 
        } 
      })
    }

    // Verify user still exists and is active
    if (session.role === 'donor') {
      const result = await query(
        `SELECT "id", "name", "email", "status", "avatar", "phone", "address", "notes" FROM "Donor" WHERE "id" = $1`,
        [session.id]
      )
      const donor = result.rows[0]
      if (!donor || donor.status !== 'Active') {
        return NextResponse.json({ user: null })
      }
      return NextResponse.json({ user: { role: 'donor', ...donor } })
    }

    if (session.role === 'volunteer') {
      const result = await query(
        `SELECT "id", "name", "email", "status", "photo", "phone", "address", "activities", "skills", "fatherName", "motherName", "institution", "department", "session", "regNo", "dateOfBirth", "bloodGroup", "donatedBlood" FROM "Volunteer" WHERE "id" = $1`,
        [session.id]
      )
      const volunteer = result.rows[0]
      if (!volunteer || volunteer.status !== 'Active') {
        return NextResponse.json({ user: null })
      }
      return NextResponse.json({ user: { role: 'volunteer', ...volunteer } })
    }

    return NextResponse.json({ user: null })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
