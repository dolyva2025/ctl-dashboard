'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { CTLRules } from '@/components/CTLRules'
import { RulesChecklist } from '@/components/RulesChecklist'
import { WeekSelector } from '@/components/WeekSelector'
import { todayDate } from '@/lib/storage'

export default function RulesPage() {
  const { user, loading } = useAuth()
  const [date, setDate] = useState(todayDate())

  if (loading || !user) return null

  const today = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Trading</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reglas de Trading</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <WeekSelector selected={date} onChange={setDate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* CTL Rules — left */}
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 h-4 leading-4">Collective Trade Lab</p>
          <div className="rounded-lg border bg-card p-6">
            <CTLRules userEmail={user.email} />
          </div>
        </div>

        {/* Daily checklist — right */}
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 h-4 leading-4">Revisión Post-Sesión</p>
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-zinc-900 text-sm">¿Seguiste tus reglas hoy?</p>
                <p className="text-xs text-zinc-500">Marca las que aplicaron en tu sesión</p>
              </div>
            </div>
            <RulesChecklist userId={user.id} date={date} />
          </div>
        </div>
      </div>
    </div>
  )
}
