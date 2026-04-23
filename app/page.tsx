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
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Pre Sesión</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Análisis Pre Sesión</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3">
            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Calendario
            </a>
          <WeekSelector selected={date} onChange={setDate} />
        </div>
      </div>
      <Checklist userId={user.id} date={date} />
    </div>
  )
}
