'use client'

import { useAuth } from '@/lib/useAuth'
import { HabitTracker } from '@/components/HabitTracker'

export default function HabitosPage() {
  const { user, loading } = useAuth()
  if (loading || !user) return null
  return <HabitTracker userId={user.id} />
}
