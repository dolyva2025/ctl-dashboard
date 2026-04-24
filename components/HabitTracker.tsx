'use client'

import { useState, useCallback, useEffect } from 'react'
import * as api from '@/lib/api'
import { localDateStr } from '@/lib/storage'

// ── Theme & Colors ─────────────────────────────────────────────────────────────

const T = {
  bg:      '#070A1C',
  surface: '#0E1428',
  surface2:'#162038',
  border:  'rgba(100,130,255,0.12)',
  text:    '#E8EEFF',
  muted:   '#6878B0',
}

const COLORS: Record<string, { main: string; dim: string; checkColor: string }> = {
  trading:   { main: 'oklch(68% 0.19 42)',  dim: 'oklch(68% 0.19 42 / 0.14)',  checkColor: '#0A0A0C' },
  salud:     { main: 'oklch(72% 0.18 155)', dim: 'oklch(72% 0.18 155 / 0.14)', checkColor: '#0A0A0C' },
  personal:  { main: 'oklch(70% 0.17 240)', dim: 'oklch(70% 0.17 240 / 0.14)', checkColor: '#0A0A0C' },
  proyectos: { main: 'oklch(68% 0.18 290)', dim: 'oklch(68% 0.18 290 / 0.14)', checkColor: '#ffffff' },
  educacion: { main: 'oklch(78% 0.17 88)',  dim: 'oklch(78% 0.17 88 / 0.14)',  checkColor: '#0A0A0C' },
}

// ── Date helpers ───────────────────────────────────────────────────────────────

const DAYS_ES: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function pad(n: number) { return String(n).padStart(2, '0') }
function dkey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function isWeekend(dow: number) { return dow === 0 || dow === 6 }
function sinceDate() { const d = new Date(); d.setDate(d.getDate() - 90); return localDateStr(d) }

// ── Types ──────────────────────────────────────────────────────────────────────

type Section = 'trading' | 'salud' | 'personal' | 'proyectos' | 'educacion'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'trading',   label: 'TRADING' },
  { id: 'salud',     label: 'SALUD' },
  { id: 'personal',  label: 'PERSONAL' },
  { id: 'proyectos', label: 'PROYECTOS CREATIVOS' },
  { id: 'educacion', label: 'EDUCACIÓN' },
]

const AUTO_HABITS = [
  { id: 'analysis', name: 'Pre-Mercado' },
  { id: 'prep',     name: 'Trading Prep' },
  { id: 'rules',    name: 'Reglas' },
  { id: 'journal',  name: 'Diario' },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export function HabitTracker({ userId }: { userId: string }) {
  const now = new Date()
  const [offset, setOffset]           = useState(0)
  const [analysisDates, setAnalysis]  = useState<string[]>([])
  const [prepDates, setPrep]          = useState<string[]>([])
  const [rulesDates, setRules]        = useState<string[]>([])
  const [journalDates, setJournal]    = useState<string[]>([])
  const [customHabits, setCustom]     = useState<api.CustomHabit[]>([])
  const [habitLogs, setHabitLogs]     = useState<Record<string, Record<string, boolean>>>({})
  const [addingTo, setAddingTo]       = useState<Section | null>(null)
  const [newName, setNewName]         = useState('')
  const [error, setError]             = useState<string | null>(null)

  const base  = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year  = base.getFullYear()
  const month = base.getMonth()
  const days  = daysInMonth(year, month)
  const isCurMonth = now.getFullYear() === year && now.getMonth() === month

  const autoSets: Record<string, Set<string>> = {
    analysis: new Set(analysisDates),
    prep:     new Set(prepDates),
    rules:    new Set(rulesDates),
    journal:  new Set(journalDates),
  }

  const loadData = useCallback(async () => {
    const since = sinceDate()
    const [autoData, habits] = await Promise.all([
      api.getAutoHabitData(userId, since),
      api.getCustomHabits(userId),
    ])
    setAnalysis(autoData.analysisDates)
    setPrep(autoData.prepDates)
    setRules(autoData.rulesDates)
    setJournal(autoData.journalDates)
    setCustom(habits)
    if (habits.length > 0) setHabitLogs(await api.getAllHabitLogs(userId, since))
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggle(habitId: string, date: string) {
    const current = habitLogs[habitId]?.[date]
    const next = current ? null : true
    setHabitLogs(prev => {
      const updated = { ...prev, [habitId]: { ...(prev[habitId] ?? {}) } }
      if (next === null) delete updated[habitId][date]
      else updated[habitId][date] = next
      return updated
    })
    try {
      await api.setHabitLog(userId, habitId, date, next)
    } catch (e) {
      setError(`Error al guardar: ${e instanceof Error ? e.message : String(e)}`)
      await loadData()
    }
  }

  async function handleAddHabit() {
    if (!newName.trim() || !addingTo) return
    try {
      const habit = await api.addCustomHabit(userId, newName.trim(), addingTo)
      setCustom(prev => [...prev, habit])
      setHabitLogs(prev => ({ ...prev, [habit.id]: {} }))
      setNewName('')
      setAddingTo(null)
    } catch (e) {
      setError(`Error al agregar: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function handleDeleteHabit(id: string) {
    await api.deleteCustomHabit(id)
    setCustom(prev => prev.filter(h => h.id !== id))
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const allCustom = customHabits
  const maxDay = isCurMonth ? now.getDate() : days
  let tot = 0, dn = 0, curStr = 0, bestStr = 0, cur = 0

  for (let d = 1; d <= maxDay; d++) {
    const dk = dkey(year, month, d)
    const dow = new Date(year, month, d).getDay()
    const weekend = isWeekend(dow)

    AUTO_HABITS.forEach(h => {
      if (weekend) return
      tot++
      if (autoSets[h.id]?.has(dk)) dn++
    })
    allCustom.forEach(h => {
      tot++
      if (habitLogs[h.id]?.[dk]) dn++
    })

    const anyDone =
      (!weekend && AUTO_HABITS.some(h => autoSets[h.id]?.has(dk))) ||
      allCustom.some(h => habitLogs[h.id]?.[dk])

    if (anyDone) { cur++; bestStr = Math.max(bestStr, cur) } else cur = 0
  }
  if (isCurMonth) curStr = cur
  const rate = tot > 0 ? Math.round((dn / tot) * 100) : 0

  // ── Streak per habit ─────────────────────────────────────────────────────────

  function habitStreak(habitId: string, isAuto: boolean, isTrading: boolean): number {
    let s = 0
    const lim = isCurMonth ? now.getDate() : days
    for (let i = lim; i >= 1; i--) {
      const dow = new Date(year, month, i).getDay()
      if (isTrading && isWeekend(dow)) continue
      const dk = dkey(year, month, i)
      const done = isAuto ? autoSets[habitId]?.has(dk) : habitLogs[habitId]?.[dk]
      if (done) s++; else break
    }
    return s
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const accent = 'oklch(68% 0.19 42)'

  return (
    <div style={{ background: T.bg, borderRadius: 16, padding: '28px 24px', color: T.text, fontFamily: 'inherit' }}>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#fca5a5' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: T.muted, marginBottom: 4 }}>DISCIPLINA</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>
            {MONTHS_ES[month]} de {year}
          </h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Consistencia es tu ventaja</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setOffset(o => o - 1)}
            style={{ width: 34, height: 34, borderRadius: 8, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => !isCurMonth && setOffset(o => o + 1)}
            style={{ width: 34, height: 34, borderRadius: 8, background: T.surface2, border: `1px solid ${T.border}`, color: isCurMonth ? T.muted : T.text, cursor: isCurMonth ? 'default' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          ['TASA MENSUAL', `${rate}%`, `${dn}/${tot} hábitos`],
          ['RACHA ACTUAL', `${curStr}d`, curStr > 0 ? '🔥 en racha' : 'sin racha hoy'],
          ['MEJOR RACHA',  `${bestStr}d`, 'este mes'],
        ].map(([label, val, sub]) => (
          <div key={label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: T.text }}>{val}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Add habit form */}
      {addingTo && (
        <div style={{ background: T.surface2, border: `1px solid ${COLORS[addingTo].main}40`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: COLORS[addingTo].main, fontWeight: 700, letterSpacing: '0.08em', marginRight: 4 }}>
            {SECTIONS.find(s => s.id === addingTo)?.label}
          </span>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); if (e.key === 'Escape') { setAddingTo(null); setNewName('') } }}
            placeholder="Nombre del hábito..."
            style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 6, padding: '6px 10px', fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleAddHabit} disabled={!newName.trim()}
            style={{ background: COLORS[addingTo].main, color: '#0a0a0c', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: newName.trim() ? 1 : 0.4 }}>
            Agregar
          </button>
          <button onClick={() => { setAddingTo(null); setNewName('') }}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Grid */}
      <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              {/* Section header row */}
              <tr>
                <th style={{ width: 72, minWidth: 72, background: T.surface, position: 'sticky', left: 0, zIndex: 3, borderBottom: `1px solid ${T.border}` }} />
                {SECTIONS.map(sec => {
                  const c = COLORS[sec.id]
                  const habits = sec.id === 'trading'
                    ? AUTO_HABITS
                    : customHabits.filter(h => h.section === sec.id)
                  const colSpan = habits.length + 1
                  return (
                    <th key={sec.id} colSpan={colSpan}
                      style={{ padding: '10px 12px', background: c.dim, borderBottom: `2px solid ${c.main}`, textAlign: 'left', borderRight: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: c.main }}>{sec.label}</span>
                    </th>
                  )
                })}
              </tr>

              {/* Habit column headers */}
              <tr>
                <th style={{ width: 72, minWidth: 72, background: T.surface, position: 'sticky', left: 0, zIndex: 3, borderBottom: `1px solid ${T.border}`, padding: '8px 12px', fontSize: 10, color: T.muted, fontWeight: 500, letterSpacing: '0.08em', textAlign: 'left' }}>
                  DÍA
                </th>
                {SECTIONS.map(sec => {
                  const c = COLORS[sec.id]
                  const habits = sec.id === 'trading'
                    ? AUTO_HABITS
                    : customHabits.filter(h => h.section === sec.id)
                  return [
                    ...habits.map(h => {
                      const s = habitStreak(h.id, sec.id === 'trading', sec.id === 'trading')
                      return (
                        <th key={h.id} style={{ width: 44, minWidth: 44, padding: '6px 2px', background: c.dim, borderBottom: `1px solid ${T.border}`, textAlign: 'center', verticalAlign: 'bottom' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            {s > 0 && <div style={{ fontSize: 9, color: c.main }}>🔥{s}</div>}
                            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, fontWeight: 600, color: T.text, opacity: 0.75, whiteSpace: 'nowrap', maxHeight: 90, overflow: 'hidden' }}>{h.name}</div>
                            {sec.id !== 'trading' && (
                              <button onClick={() => handleDeleteHabit(h.id)}
                                style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12, opacity: 0.4, lineHeight: 1, padding: '1px 2px' }}
                                title="Eliminar">×</button>
                            )}
                          </div>
                        </th>
                      )
                    }),
                    // "+" add button column
                    <th key={sec.id + '-add'} style={{ width: 34, minWidth: 34, background: c.dim, borderBottom: `1px solid ${T.border}`, textAlign: 'center', borderRight: `1px solid ${T.border}`, padding: 4 }}>
                      {sec.id !== 'trading' && (
                        <button onClick={() => { setAddingTo(sec.id); setNewName('') }}
                          style={{ background: 'transparent', border: `1px dashed ${c.main}`, color: c.main, borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', opacity: 0.7 }}>+</button>
                      )}
                    </th>,
                  ]
                })}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1
                const d = new Date(year, month, day)
                const dow = d.getDay()
                const weekend = isWeekend(dow)
                const isToday = isCurMonth && now.getDate() === day
                const isFuture = isCurMonth && day > now.getDate()
                const dk = dkey(year, month, day)

                return (
                  <tr key={day} style={{ background: isToday ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    {/* Day label — sticky */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 2, background: isToday ? T.surface2 : T.surface, padding: '3px 12px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, color: isToday ? accent : T.muted, fontWeight: isToday ? 700 : 400 }}>{DAYS_ES[dow]} </span>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? T.text : T.muted }}>{day}</span>
                    </td>

                    {SECTIONS.map(sec => {
                      const c = COLORS[sec.id]
                      const habits = sec.id === 'trading'
                        ? AUTO_HABITS
                        : customHabits.filter(h => h.section === sec.id)

                      return [
                        ...habits.map(h => {
                          const disabled = isFuture || (sec.id === 'trading' && weekend)
                          const done = sec.id === 'trading'
                            ? autoSets[h.id]?.has(dk) ?? false
                            : !!(habitLogs[h.id]?.[dk])
                          const canClick = !disabled && sec.id !== 'trading'
                          const isPast = !isFuture

                          return (
                            <td key={h.id} style={{ padding: '3px 4px', borderBottom: `1px solid ${T.border}`, background: c.dim, textAlign: 'center' }}>
                              {disabled ? (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.02)', margin: '0 auto' }} />
                              ) : (
                                <div
                                  onClick={() => canClick && handleToggle(h.id, dk)}
                                  style={{
                                    width: 36, height: 36, borderRadius: 6, margin: '0 auto',
                                    background: done ? c.main : 'rgba(255,255,255,0.04)',
                                    border: isToday && !done ? `1.5px solid ${c.main}` : `1px solid ${T.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: canClick ? 'pointer' : 'default',
                                    transition: 'all 0.12s',
                                  }}
                                >
                                  {done ? (
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                      <polyline points="2,7 5.5,10.5 12,3.5" stroke={c.checkColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : isPast ? (
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                  ) : null}
                                </div>
                              )}
                            </td>
                          )
                        }),
                        // Spacer column
                        <td key={sec.id + '-sp'} style={{ width: 34, background: c.dim, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }} />,
                      ]
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
