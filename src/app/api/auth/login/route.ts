import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { cookies } from 'next/headers'

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
    const { email, password, role } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hashedPassword = simpleHash(password)

    if (role === 'admin') {
      // Check for admin credentials (stored in settings or hardcoded)
      if (email === 'admin@kin.org' && password === 'admin123') {
        const cookieStore = await cookies()
        cookieStore.set('session', JSON.stringify({ role: 'admin', email }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: '/',
        })
        return NextResponse.json({ 
          success: true, 
          user: { role: 'admin', email, name: 'Administrator' } 
        })
      }
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 })
    }

    if (role === 'donor') {
      const result = await query('SELECT * FROM "Donor" WHERE "email" = $1', [email])
      const donor = result.rows[0]
      if (!donor || donor.password !== hashedPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      if (donor.status !== 'Active') {
        return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
      }
      const cookieStore = await cookies()
      cookieStore.set('session', JSON.stringify({ 
        role: 'donor', 
        id: donor.id, 
        email: donor.email, 
        name: donor.name 
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return NextResponse.json({ 
        success: true, 
        user: { role: 'donor', id: donor.id, email: donor.email, name: donor.name, avatar: donor.avatar } 
      })
    }

    if (role === 'volunteer') {
      const result = await query('SELECT * FROM "Volunteer" WHERE "email" = $1', [email])
      const volunteer = result.rows[0]
      if (!volunteer || volunteer.password !== hashedPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      if (volunteer.status !== 'Active') {
        return NextResponse.json({ error: 'Account is not active. Status: ' + volunteer.status }, { status: 403 })
      }
      const cookieStore = await cookies()
      cookieStore.set('session', JSON.stringify({ 
        role: 'volunteer', 
        id: volunteer.id, 
        email: volunteer.email, 
        name: volunteer.name 
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return NextResponse.json({ 
        success: true, 
        user: { role: 'volunteer', id: volunteer.id, email: volunteer.email, name: volunteer.name, photo: volunteer.photo } 
      })
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
