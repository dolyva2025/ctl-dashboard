'use client'

import { useState } from 'react'
import { Checklist } from '@/components/Checklist'
import { WeekSelector } from '@/components/WeekSelector'
import { useAuth } from '@/lib/useAuth'
import { todayDate } from '@/lib/storage'

export default function RoutinePage() {
  const { user, loading } = useAuth()
  const [date, setDate] = useState(todayDate())

  const today = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading || !user) return null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Pre-Mercado</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rutina del Día</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <WeekSelector selected={date} onChange={setDate} />
      </div>
      <Checklist userId={user.id} date={date} />
    </div>
  )
}
