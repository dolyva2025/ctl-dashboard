'use client'

import { useState, useEffect } from 'react'
import { CTLLevels } from '@/components/CTLLevels'
import { CTLBias } from '@/components/CTLBias'
import { WeekSelector } from '@/components/WeekSelector'
import { todayDate } from '@/lib/storage'
import { useAuth } from '@/lib/useAuth'
import * as api from '@/lib/api'

export default function LevelsPage() {
  const { user, loading } = useAuth()
  const [date, setDate] = useState(todayDate())

  useEffect(() => {
    if (!user) return
    api.getLevels(user.id, date)
  }, [user, date])

  const today = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading || !user) return null

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Pre-Mercado</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Niveles de Interés</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <WeekSelector selected={date} onChange={setDate} />
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <CTLBias date={date} userEmail={user.email} />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <CTLLevels date={date} userEmail={user.email} />
        </div>
      </div>
    </div>
  )
}
