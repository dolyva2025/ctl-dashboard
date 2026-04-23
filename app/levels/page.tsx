'use client'

import { useState, useEffect } from 'react'
import { CTLLevels } from '@/components/CTLLevels'
import { CTLBias } from '@/components/CTLBias'
import { WeekSelector } from '@/components/WeekSelector'
import { todayDate } from '@/lib/storage'
import { useAuth } from '@/lib/useAuth'
import * as api from '@/lib/api'

function getSundayDate(): string {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() - 1)
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
}

export default function LevelsPage() {
  const { user, loading } = useAuth()
  const [date, setDate] = useState(todayDate())
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [sundayBias, setSundayBias] = useState<string | null>(null)

  const sundayDate = getSundayDate()
  const isViewingSunday = date === sundayDate

  useEffect(() => {
    if (!user) return
    api.getLevels(user.id, date)
  }, [user, date])

  useEffect(() => {
    api.getCTLBias(sundayDate).then((b) => setSundayBias(b?.bias ?? null))
  }, [sundayDate])

  const today = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading || !user) return null

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Sesión</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pre-Market Plan</h1>
          <p className="text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <WeekSelector selected={date} onChange={setDate} includeSunday />
      </div>

      {/* Weekly prep reference — only show on weekdays */}
      {!isViewingSunday && (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
          <button
            onClick={() => setWeeklyOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-zinc-900 text-sm">Weekly Prep</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-zinc-500">Referencia semanal</p>
                  {sundayBias && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
                      sundayBias === 'Alcista' ? 'bg-green-500' :
                      sundayBias === 'Bajista' ? 'bg-red-500' :
                      'bg-orange-500'
                    }`}>
                      {sundayBias}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-zinc-400 transition-transform ${weeklyOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {weeklyOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-zinc-200 pt-4">
              <CTLBias date={sundayDate} userEmail={user.email} readOnly />
              <CTLLevels date={sundayDate} userEmail={user.email} readOnly />
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm">Bias + Niveles clave del día</p>
            <p className="text-xs text-zinc-500">Análisis Collective Trade Lab</p>
          </div>
        </div>
        <CTLBias date={date} userEmail={user.email} hideHeader />
        <div className="border-t border-zinc-100" />
        <CTLLevels date={date} userEmail={user.email} hideHeader />
      </div>
    </div>
  )
}
