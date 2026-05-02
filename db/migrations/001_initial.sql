-- KIN Automation - PostgreSQL Database Schema
-- Migration: 001_initial

-- Donor accounts
CREATE TABLE IF NOT EXISTS "Donor" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT UNIQUE,
  "password" TEXT NOT NULL,
  "address" TEXT,
  "notes" TEXT,
  "avatar" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Volunteer accounts
CREATE TABLE IF NOT EXISTS "Volunteer" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT UNIQUE,
  "password" TEXT NOT NULL,
  "fatherName" TEXT,
  "motherName" TEXT,
  "address" TEXT,
  "institution" TEXT,
  "session" TEXT,
  "regNo" TEXT,
  "department" TEXT,
  "dateOfBirth" TEXT,
  "bloodGroup" TEXT,
  "donatedBlood" TEXT,
  "activities" TEXT,
  "skills" TEXT,
  "photo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Events or donation drives
CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "needs" TEXT,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Published',
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Donations (monetary or in-kind)
CREATE TABLE IF NOT EXISTS "Donation" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "donorId" TEXT NOT NULL REFERENCES "Donor"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION,
  "remainingAmount" DOUBLE PRECISION,
  "note" TEXT,
  "paymentMethod" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
  "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Items associated with in-kind donations
CREATE TABLE IF NOT EXISTS "DonationItem" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "donationId" TEXT NOT NULL REFERENCES "Donation"("id") ON DELETE CASCADE,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "remainingQuantity" INTEGER NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'others',
  "description" TEXT
);

-- Pickup tasks for in-kind donations and cash collections
CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "donationId" TEXT NOT NULL REFERENCES "Donation"("id") ON DELETE CASCADE,
  "volunteerId" TEXT REFERENCES "Volunteer"("id") ON DELETE SET NULL,
  "pickupAddress" TEXT NOT NULL,
  "pickupLat" DOUBLE PRECISION,
  "pickupLng" DOUBLE PRECISION,
  "pickupTime" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "proofPath" TEXT,
  "notes" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'Normal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Record each distribution of funds or items to beneficiaries
CREATE TABLE IF NOT EXISTS "DonationDistribution" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "donationId" TEXT NOT NULL REFERENCES "Donation"("id") ON DELETE CASCADE,
  "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL,
  "itemName" TEXT,
  "quantity" INTEGER,
  "amount" DOUBLE PRECISION,
  "proofPath" TEXT,
  "beneficiary" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Payment records
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "donationId" TEXT NOT NULL REFERENCES "Donation"("id") ON DELETE CASCADE,
  "donorId" TEXT NOT NULL REFERENCES "Donor"("id") ON DELETE CASCADE,
  "method" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "transactionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "proofPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Notifications for users
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "userId" TEXT NOT NULL,
  "userType" TEXT NOT NULL,
  "donorId" TEXT REFERENCES "Donor"("id") ON DELETE CASCADE,
  "volunteerId" TEXT REFERENCES "Volunteer"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Admin settings
CREATE TABLE IF NOT EXISTS "Setting" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Messages/Contact system
CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT PRIMARY KEY DEFAULT concat('c', gen_random_uuid()::text),
  "senderId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unread',
  "reply" TEXT,
  "repliedAt" TIMESTAMP(3),
  "repliedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_donation_donorId" ON "Donation"("donorId");
CREATE INDEX IF NOT EXISTS "idx_donation_eventId" ON "Donation"("eventId");
CREATE INDEX IF NOT EXISTS "idx_donation_status" ON "Donation"("status");
CREATE INDEX IF NOT EXISTS "idx_donation_type" ON "Donation"("type");
CREATE INDEX IF NOT EXISTS "idx_donation_createdAt" ON "Donation"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_donationItem_donationId" ON "DonationItem"("donationId");
CREATE INDEX IF NOT EXISTS "idx_donationItem_category" ON "DonationItem"("category");

CREATE INDEX IF NOT EXISTS "idx_task_donationId" ON "Task"("donationId");
CREATE INDEX IF NOT EXISTS "idx_task_volunteerId" ON "Task"("volunteerId");
CREATE INDEX IF NOT EXISTS "idx_task_status" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "idx_task_createdAt" ON "Task"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_distribution_donationId" ON "DonationDistribution"("donationId");
CREATE INDEX IF NOT EXISTS "idx_distribution_eventId" ON "DonationDistribution"("eventId");

CREATE INDEX IF NOT EXISTS "idx_payment_donationId" ON "Payment"("donationId");
CREATE INDEX IF NOT EXISTS "idx_payment_donorId" ON "Payment"("donorId");
CREATE INDEX IF NOT EXISTS "idx_payment_status" ON "Payment"("status");

CREATE INDEX IF NOT EXISTS "idx_notification_userId" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "idx_notification_donorId" ON "Notification"("donorId");
CREATE INDEX IF NOT EXISTS "idx_notification_volunteerId" ON "Notification"("volunteerId");
CREATE INDEX IF NOT EXISTS "idx_notification_read" ON "Notification"("read");

CREATE INDEX IF NOT EXISTS "idx_volunteer_status" ON "Volunteer"("status");
CREATE INDEX IF NOT EXISTS "idx_donor_status" ON "Donor"("status");

CREATE INDEX IF NOT EXISTS "idx_event_status" ON "Event"("status");

-- Trigger function to auto-update "updatedAt" column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables with updatedAt
CREATE TRIGGER update_donor_updatedAt BEFORE UPDATE ON "Donor" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_volunteer_updatedAt BEFORE UPDATE ON "Volunteer" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_updatedAt BEFORE UPDATE ON "Event" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_donation_updatedAt BEFORE UPDATE ON "Donation" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_updatedAt BEFORE UPDATE ON "Task" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_setting_updatedAt BEFORE UPDATE ON "Setting" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- KIN Automation - Add missing timestamp columns
-- Migration: 002_add_missing_timestamps
--
-- Some INSERT queries reference "createdAt" and "updatedAt" columns
-- that were missing from the initial schema. This migration adds them.

-- DonationItem: add both createdAt and updatedAt
ALTER TABLE "DonationItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
ALTER TABLE "DonationItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- DonationDistribution: add updatedAt (createdAt already exists)
ALTER TABLE "DonationDistribution" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Payment: add updatedAt (createdAt already exists)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Notification: add updatedAt (createdAt already exists)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Message: add updatedAt (createdAt already exists)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Add auto-update triggers for the new updatedAt columns
CREATE TRIGGER update_donationItem_updatedAt BEFORE UPDATE ON "DonationItem" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_donationDistribution_updatedAt BEFORE UPDATE ON "DonationDistribution" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_updatedAt BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_updatedAt BEFORE UPDATE ON "Notification" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_updatedAt BEFORE UPDATE ON "Message" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
