export interface User {
  role: 'donor' | 'volunteer' | 'admin'
  id?: string
  name: string
  email: string
  avatar?: string
  photo?: string
  phone?: string
  address?: string
  activities?: string
  skills?: string
  fatherName?: string
  motherName?: string
  institution?: string
  department?: string
  session?: string
  regNo?: string
  dateOfBirth?: string
  bloodGroup?: string
  donatedBlood?: string
  notes?: string
}

export interface DonationDistribution {
  id: string
  donationId: string
  itemName?: string | null
  quantity?: number | null
  amount?: number | null
  proofPath?: string | null
  beneficiary?: string | null
  notes?: string | null
  createdAt: string
}

export interface Donation {
  id: string
  donorId: string
  type: string
  amount: number | null
  remainingAmount?: number | null
  note: string | null
  status: string
  paymentStatus: string
  paymentMethod?: string | null
  createdAt: string
  donor?: { name: string; email: string; phone?: string; address?: string }
  event?: { name: string } | null
  items?: DonationItem[]
  tasks?: Task[]
  distributions?: DonationDistribution[]
  _count?: { distributions: number }
}

export interface DonationItem {
  id: string
  itemName: string
  quantity: number
  remainingQuantity?: number
  category: string
  description?: string | null
}

export interface Task {
  id: string
  donationId: string
  volunteerId: string | null
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  pickupTime: string | null
  status: string
  priority: string
  proofPath?: string | null
  notes?: string | null
  createdAt?: string
  donation?: Donation
  volunteer?: { name: string } | null
}

export interface Event {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate?: string | null
  location?: string | null
  status: string
  image?: string | null
  needs?: string | null
}

export interface Volunteer {
  id: string
  name: string
  email: string
  phone?: string | null
  status: string
  skills?: string | null
  activities?: string | null
  photo?: string | null
  fatherName?: string | null
  motherName?: string | null
  address?: string | null
  institution?: string | null
  department?: string | null
  bloodGroup?: string | null
  dateOfBirth?: string | null
  session?: string | null
  regNo?: string | null
  createdAt?: string
}

export interface Donor {
  id: string
  name: string
  email: string
  phone?: string | null
  status: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  senderType: string
  senderName: string
  senderEmail: string
  subject: string
  message: string
  status: string
  reply?: string | null
  repliedAt?: string | null
  createdAt: string
}
