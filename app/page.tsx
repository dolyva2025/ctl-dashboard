'use client'

import { useState } from 'react'
import { Checklist } from '@/components/Checklist'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/themeContext'
import { todayDate } from '@/lib/storage'

const ACCENT = 'oklch(68% 0.19 42)'
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

function getWeekDays(from: Date): Date[] {
  const dow = from.getDay()
  const start = new Date(from)
  start.setDate(from.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function RoutinePage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'

  const [date, setDate] = useState(todayDate())

  const muted  = isDark ? 'hsl(228 30% 55%)' : '#71717a'
  const text   = isDark ? 'hsl(228 100% 95%)' : '#09090b'
  const borderC = isDark ? 'hsl(228 30% 17%)' : '#e4e4e7'

  if (loading || !user) return null

  const today = new Date()
  const weekDays = getWeekDays(today)

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase())

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 0 40px', color: text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: muted, marginBottom: 4 }}>PRE SESIÓN</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: text }}>
            Análisis Pre Sesión
          </h1>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{dateLabel}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          {/* Week strip */}
          <div style={{ display: 'flex', gap: 5 }}>
            {weekDays.map((d, i) => {
              const ds = toDateString(d)
              const isToday = d.toDateString() === today.toDateString()
              const isSelected = ds === date
              return (
                <button
                  key={i}
                  onClick={() => setDate(ds)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: isSelected
                      ? ACCENT
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                    outline: isSelected ? 'none' : `1px solid ${borderC}`,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: isSelected ? '#0A0A0C' : muted }}>
                    {DAYS_SHORT[i]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#0A0A0C' : text }}>
                    {d.getDate()}
                  </span>
                  {isToday && (
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: isSelected ? 'rgba(0,0,0,0.4)' : ACCENT }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Calendario link */}
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
              border: `1px solid ${borderC}`, color: muted,
              transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Calendario económico
          </a>
        </div>
      </div>

      <Checklist userId={user.id} date={date} />
    </div>
  )
}
