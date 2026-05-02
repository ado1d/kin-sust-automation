'use client'

import { createContext } from 'react'
import type { User } from '@/lib/types'

export const SessionContext = createContext<{
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
}>({ user: null, setUser: () => {}, loading: true })
