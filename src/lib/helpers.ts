import { query } from '@/lib/db'

// ---------------------------------------------------------------------------
// Task enrichment helpers
// ---------------------------------------------------------------------------

/**
 * Enrich a single task row with its related donation (→ donor, items, event)
 * and volunteer objects, matching Prisma's `include` shape.
 */
export async function enrichTask(task: Record<string, any>) {
  const [donationResult, volunteerResult] = await Promise.all([
    task.donationId
      ? query('SELECT * FROM "Donation" WHERE "id" = $1', [task.donationId])
      : null,
    task.volunteerId
      ? query('SELECT * FROM "Volunteer" WHERE "id" = $1', [task.volunteerId])
      : null,
  ])

  const donation = donationResult?.rows[0] || null
  const volunteer = volunteerResult?.rows[0] || null

  if (donation) {
    const [donorResult, itemsResult, eventResult] = await Promise.all([
      donation.donorId
        ? query('SELECT * FROM "Donor" WHERE "id" = $1', [donation.donorId])
        : null,
      query('SELECT * FROM "DonationItem" WHERE "donationId" = $1', [donation.id]),
      donation.eventId
        ? query('SELECT * FROM "Event" WHERE "id" = $1', [donation.eventId])
        : null,
    ])
    donation.donor = donorResult?.rows[0] || null
    donation.items = itemsResult.rows
    donation.event = eventResult?.rows[0] || null
  }

  task.donation = donation
  task.volunteer = volunteer
  return task
}

/**
 * Batch-enrich an array of task rows with related data.
 * Uses bulk queries to avoid N+1.
 */
export async function enrichTasks(tasks: Record<string, any>[]) {
  if (tasks.length === 0) return tasks

  const donationIds = [...new Set(tasks.map(t => t.donationId).filter(Boolean))]
  const volunteerIds = [...new Set(tasks.map(t => t.volunteerId).filter(Boolean))]

  const [donationRows, volunteerRows] = await Promise.all([
    donationIds.length > 0
      ? query('SELECT * FROM "Donation" WHERE "id" = ANY($1)', [donationIds])
      : { rows: [] },
    volunteerIds.length > 0
      ? query('SELECT * FROM "Volunteer" WHERE "id" = ANY($1)', [volunteerIds])
      : { rows: [] },
  ])

  const donationMap = Object.fromEntries(donationRows.rows.map((d: any) => [d.id, d]))
  const volunteerMap = Object.fromEntries(volunteerRows.rows.map((v: any) => [v.id, v]))

  // Donation-related lookups
  const donorIds = [...new Set(donationRows.rows.map((d: any) => d.donorId).filter(Boolean))]
  const eventIds = [...new Set(donationRows.rows.map((d: any) => d.eventId).filter(Boolean))]

  const [donorRows, itemRows, eventRows] = await Promise.all([
    donorIds.length > 0
      ? query('SELECT * FROM "Donor" WHERE "id" = ANY($1)', [donorIds])
      : { rows: [] },
    donationIds.length > 0
      ? query('SELECT * FROM "DonationItem" WHERE "donationId" = ANY($1)', [donationIds])
      : { rows: [] },
    eventIds.length > 0
      ? query('SELECT * FROM "Event" WHERE "id" = ANY($1)', [eventIds])
      : { rows: [] },
  ])

  const donorMap = Object.fromEntries(donorRows.rows.map((d: any) => [d.id, d]))
  const eventMap = Object.fromEntries(eventRows.rows.map((e: any) => [e.id, e]))
  const itemsByDonation: Record<string, any[]> = {}
  for (const item of itemRows.rows) {
    if (!itemsByDonation[item.donationId]) itemsByDonation[item.donationId] = []
    itemsByDonation[item.donationId].push(item)
  }

  // Attach related data to donation rows
  for (const donation of donationRows.rows) {
    donation.donor = donorMap[donation.donorId] || null
    donation.items = itemsByDonation[donation.id] || []
    donation.event = eventMap[donation.eventId] || null
  }

  // Attach related data to task rows
  for (const task of tasks) {
    task.donation = donationMap[task.donationId] || null
    task.volunteer = volunteerMap[task.volunteerId] || null
  }

  return tasks
}

// ---------------------------------------------------------------------------
// Payment enrichment helpers
// ---------------------------------------------------------------------------

/**
 * Enrich a single payment row with its related donation and donor.
 */
export async function enrichPayment(payment: Record<string, any>) {
  const [donationResult, donorResult] = await Promise.all([
    payment.donationId
      ? query(
          'SELECT "id", "type", "amount", "status", "paymentStatus", "paymentMethod" FROM "Donation" WHERE "id" = $1',
          [payment.donationId],
        )
      : null,
    payment.donorId
      ? query('SELECT "id", "name", "email", "phone" FROM "Donor" WHERE "id" = $1', [payment.donorId])
      : null,
  ])

  payment.donation = donationResult?.rows[0] || null
  payment.donor = donorResult?.rows[0] || null
  return payment
}

/**
 * Batch-enrich an array of payment rows with related donation and donor data.
 */
export async function enrichPayments(payments: Record<string, any>[]) {
  if (payments.length === 0) return payments

  const donationIds = [...new Set(payments.map(p => p.donationId).filter(Boolean))]
  const donorIds = [...new Set(payments.map(p => p.donorId).filter(Boolean))]

  const [donationRows, donorRows] = await Promise.all([
    donationIds.length > 0
      ? query(
          'SELECT "id", "type", "amount", "status", "paymentStatus", "paymentMethod" FROM "Donation" WHERE "id" = ANY($1)',
          [donationIds],
        )
      : { rows: [] },
    donorIds.length > 0
      ? query('SELECT "id", "name", "email", "phone" FROM "Donor" WHERE "id" = ANY($1)', [donorIds])
      : { rows: [] },
  ])

  const donationMap = Object.fromEntries(donationRows.rows.map((d: any) => [d.id, d]))
  const donorMap = Object.fromEntries(donorRows.rows.map((d: any) => [d.id, d]))

  for (const payment of payments) {
    payment.donation = donationMap[payment.donationId] || null
    payment.donor = donorMap[payment.donorId] || null
  }

  return payments
}
