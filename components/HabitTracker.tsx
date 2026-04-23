'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Flame, Check } from 'lucide-react'
import * as api from '@/lib/api'
import { localDateStr } from '@/lib/storage'

// ── Constants ──────────────────────────────────────────────────────────────────

const CELL = 36
const DAY_COL = 76

const SECTION_STYLES = {
  trading: { bg: '#18181b', text: '#ffffff', colBg: '#52525b' },
  salud:   { bg: '#dcfce7', text: '#166534', colBg: '#86efac' },
  personal:{ bg: '#dbeafe', text: '#1e40af', colBg: '#93c5fd' },
}

const DOW: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6
}

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(localDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function computeStreak(completedSet: Set<string>, tradingOnly: boolean): number {
  const todayStr = localDateStr(new Date())
  let d = new Date()
  if (!completedSet.has(todayStr)) d = addDays(d, -1)
  let streak = 0
  while (streak < 365) {
    if (tradingOnly && isWeekend(d)) { d = addDays(d, -1); continue }
    if (!completedSet.has(localDateStr(d))) break
    streak++
    d = addDays(d, -1)
  }
  return streak
}

function sinceDate(): string {
  return localDateStr(addDays(new Date(), -90))
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Section = 'trading' | 'salud' | 'personal'

type Habit = {
  id: string
  name: string
  section: Section
  type: 'auto' | 'custom'
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function HabitTracker({ userId }: { userId: string }) {
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [analysisDates, setAnalysisDates] = useState<string[]>([])
  const [prepDates, setPrepDates]         = useState<string[]>([])
  const [rulesDates, setRulesDates]       = useState<string[]>([])
  const [journalDates, setJournalDates]   = useState<string[]>([])
  const [customHabits, setCustomHabits]   = useState<api.CustomHabit[]>([])
  const [habitLogs, setHabitLogs]         = useState<Record<string, Record<string, boolean>>>({})
  const [addingTo, setAddingTo]           = useState<Section | null>(null)
  const [newName, setNewName]             = useState('')
  const [adding, setAdding]               = useState(false)

  const loadData = useCallback(async () => {
    const since = sinceDate()
    const [autoData, habits] = await Promise.all([
      api.getAutoHabitData(userId, since),
      api.getCustomHabits(userId),
    ])
    setAnalysisDates(autoData.analysisDates)
    setPrepDates(autoData.prepDates)
    setRulesDates(autoData.rulesDates)
    setJournalDates(autoData.journalDates)
    setCustomHabits(habits)
    if (habits.length > 0) setHabitLogs(await api.getAllHabitLogs(userId, since))
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleAddHabit() {
    if (!newName.trim() || !addingTo) return
    setAdding(true)
    const habit = await api.addCustomHabit(userId, newName.trim(), addingTo)
    setCustomHabits(prev => [...prev, habit])
    setHabitLogs(prev => ({ ...prev, [habit.id]: {} }))
    setNewName('')
    setAddingTo(null)
    setAdding(false)
  }

  async function handleDeleteHabit(id: string) {
    await api.deleteCustomHabit(id)
    setCustomHabits(prev => prev.filter(h => h.id !== id))
    setHabitLogs(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  // Click cycle: undefined → true(done ×) → false(miss ·) → undefined
  async function handleToggle(habitId: string, date: string) {
    const current = habitLogs[habitId]?.[date]
    const next: boolean | null = current === undefined ? true : current === true ? false : null
    setHabitLogs(prev => {
      const updated = { ...prev, [habitId]: { ...(prev[habitId] ?? {}) } }
      if (next === null) delete updated[habitId][date]
      else updated[habitId][date] = next
      return updated
    })
    await api.setHabitLog(userId, habitId, date, next)
  }

  // ── Build habit list ─────────────────────────────────────────────────────────

  const tradingHabits: Habit[] = [
    { id: 'analysis', name: 'Pre-Mercado',  section: 'trading', type: 'auto' },
    { id: 'prep',     name: 'Trading Prep', section: 'trading', type: 'auto' },
    { id: 'rules',    name: 'Reglas',       section: 'trading', type: 'auto' },
    { id: 'journal',  name: 'Diario',       section: 'trading', type: 'auto' },
  ]

  const saludHabits:    Habit[] = customHabits.filter(h => h.section === 'salud').map(h => ({ ...h, section: 'salud' as Section, type: 'custom' as const }))
  const personalHabits: Habit[] = customHabits.filter(h => h.section === 'personal').map(h => ({ ...h, section: 'personal' as Section, type: 'custom' as const }))
  const allHabits = [...tradingHabits, ...saludHabits, ...personalHabits]

  // ── Completed sets ───────────────────────────────────────────────────────────

  const autoSets: Record<string, Set<string>> = {
    analysis: new Set(analysisDates),
    prep:     new Set(prepDates),
    rules:    new Set(rulesDates),
    journal:  new Set(journalDates),
  }

  function getCompletedSet(habit: Habit): Set<string> {
    if (habit.type === 'auto') return autoSets[habit.id] ?? new Set()
    return new Set(Object.entries(habitLogs[habit.id] ?? {}).filter(([, v]) => v).map(([k]) => k))
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  const MIN_COLS = 4
  const saludCols    = Math.max(MIN_COLS, saludHabits.length)
  const personalCols = Math.max(MIN_COLS, personalHabits.length)
  const totalWidth   = DAY_COL + (4 + saludCols + personalCols) * CELL

  // Pad each custom section to MIN_COLS with placeholder entries
  type DisplayHabit = Habit | { id: string; name: string; section: Section; type: 'placeholder' }
  function padSection(habits: Habit[], section: Section): DisplayHabit[] {
    const result: DisplayHabit[] = [...habits]
    for (let i = habits.length; i < MIN_COLS; i++) {
      result.push({ id: `ph-${section}-${i}`, name: '', section, type: 'placeholder' })
    }
    return result
  }
  const displaySalud    = padSection(saludHabits, 'salud')
  const displayPersonal = padSection(personalHabits, 'personal')
  const displayHabits: DisplayHabit[] = [...tradingHabits, ...displaySalud, ...displayPersonal]

  const days = getMonthDays(monthYear.year, monthYear.month)
  const today = localDateStr(new Date())

  const monthLabel = new Date(monthYear.year, monthYear.month, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  function prevMonth() {
    setMonthYear(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })
  }
  function nextMonth() {
    const now = new Date()
    setMonthYear(prev => {
      if (prev.year === now.getFullYear() && prev.month === now.getMonth()) return prev
      return prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Disciplina</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">{monthLabel}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Consistencia es tu ventaja</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-sm font-medium text-zinc-600 capitalize w-40 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <div style={{ minWidth: totalWidth }}>

          {/* ── Section headers ── */}
          <div className="flex" style={{ borderBottom: '2px solid #e4e4e7' }}>
            <div style={{ width: DAY_COL, minWidth: DAY_COL }} className="border-r-2 border-zinc-200" />

            {/* Trading */}
            <div style={{ width: 4 * CELL, backgroundColor: SECTION_STYLES.trading.bg }}
              className="flex items-center justify-center py-2 border-r-2 border-zinc-300">
              <span style={{ color: SECTION_STYLES.trading.text }} className="text-xs font-bold uppercase tracking-widest">
                Trading
              </span>
            </div>

            {/* Salud */}
            <div style={{ width: saludCols * CELL, backgroundColor: SECTION_STYLES.salud.bg }}
              className="flex items-center justify-between px-2 py-2 border-r-2 border-zinc-300">
              <span style={{ color: SECTION_STYLES.salud.text }} className="text-xs font-bold uppercase tracking-widest">
                Salud
              </span>
              <button onClick={() => { setAddingTo('salud'); setNewName('') }}
                style={{ color: SECTION_STYLES.salud.text }} className="opacity-60 hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Personal */}
            <div style={{ width: personalCols * CELL, backgroundColor: SECTION_STYLES.personal.bg }}
              className="flex items-center justify-between px-2 py-2">
              <span style={{ color: SECTION_STYLES.personal.text }} className="text-xs font-bold uppercase tracking-widest">
                Personal
              </span>
              <button onClick={() => { setAddingTo('personal'); setNewName('') }}
                style={{ color: SECTION_STYLES.personal.text }} className="opacity-60 hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Habit column headers (rotated names) ── */}
          <div className="flex border-b-2 border-zinc-200">
            <div style={{ width: DAY_COL, minWidth: DAY_COL }} className="border-r-2 border-zinc-200" />

            {displayHabits.map((habit, i) => {
              const style = SECTION_STYLES[habit.section]
              const isPlaceholder = habit.type === 'placeholder'
              const realHabit = isPlaceholder ? null : (habit as Habit)
              const streak = realHabit ? computeStreak(getCompletedSet(realHabit), realHabit.section === 'trading') : 0
              const isLastTrading = i === 3
              const isLastSalud   = i === 3 + saludCols
              const isSectionBorder = isLastTrading || isLastSalud

              return (
                <div key={habit.id}
                  style={{ width: CELL, minWidth: CELL, borderRight: isSectionBorder ? '2px solid #d4d4d8' : '1px solid #f4f4f5' }}
                  className="flex flex-col items-center">

                  {/* Color bar */}
                  <div style={{ height: 10, width: '100%', backgroundColor: style.colBg }} />

                  {/* Vertical name */}
                  <div style={{ height: 110, width: CELL, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPlaceholder ? (
                      <span className="text-zinc-300 text-lg">+</span>
                    ) : (
                      <span
                        title={habit.name}
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#18181b',
                          letterSpacing: '0.02em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxHeight: 104,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {habit.name}
                      </span>
                    )}
                  </div>

                  {/* Streak + delete */}
                  <div className="flex flex-col items-center gap-0.5 pb-2">
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-zinc-500">
                        <Flame className="w-2.5 h-2.5 text-orange-500" />{streak}
                      </span>
                    )}
                    {habit.type === 'custom' && (
                      <button onClick={() => handleDeleteHabit(habit.id)} className="text-zinc-200 hover:text-red-400 transition-colors">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Day rows ── */}
          {days.map(date => {
            const d = new Date(date + 'T12:00:00')
            const dow = d.getDay()
            const dayNum = d.getDate()
            const isToday   = date === today
            const isFuture  = date > today
            const weekend   = isWeekend(d)

            return (
              <div key={date} className="flex border-b border-zinc-50"
                style={{ height: CELL, backgroundColor: isToday ? '#fefce8' : weekend ? '#fafafa' : 'transparent' }}>

                {/* Day label */}
                <div style={{ width: DAY_COL, minWidth: DAY_COL }}
                  className="flex items-center gap-1.5 px-2 border-r-2 border-zinc-200">
                  <span className={`text-xs w-7 ${weekend ? 'text-zinc-400' : 'text-zinc-400'}`}>{DOW[dow]}</span>
                  <span className={`text-xs font-bold tabular-nums ${
                    isToday ? 'bg-zinc-900 text-white px-1.5 py-0.5 rounded' : weekend ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>{dayNum}</span>
                </div>

                {/* Habit cells */}
                {displayHabits.map((habit, i) => {
                  const isLastTrading = i === 3
                  const isLastSalud   = i === 3 + saludCols
                  const isSectionBorder = isLastTrading || isLastSalud
                  const isPlaceholder = habit.type === 'placeholder'
                  const noTradingWeekend = habit.type === 'auto' && weekend

                  let done: boolean | undefined
                  let canToggle = false

                  if (isPlaceholder || noTradingWeekend) {
                    done = undefined
                    canToggle = false
                  } else if (habit.type === 'auto') {
                    const set = autoSets[habit.id]
                    done = set?.has(date) ? true : (!isFuture ? false : undefined)
                  } else {
                    done = habitLogs[habit.id]?.[date]
                    canToggle = !isFuture
                  }

                  const style = SECTION_STYLES[habit.section]

                  return (
                    <button
                      key={habit.id}
                      onClick={() => canToggle && handleToggle(habit.id, date)}
                      disabled={!canToggle || isPlaceholder}
                      style={{
                        width: CELL, minWidth: CELL,
                        borderRight: isSectionBorder ? '2px solid #d4d4d8' : '1px solid #f4f4f5',
                        backgroundColor: done === true ? '#f97316' : done === false && !isFuture && !noTradingWeekend ? '#09090b' : 'transparent',
                      }}
                      className={`flex items-center justify-center transition-colors ${
                        canToggle && done === undefined ? 'hover:bg-zinc-50' : ''
                      }`}
                    >
                      {done === true && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      )}
                      {done === false && !isFuture && !noTradingWeekend && (
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>×</span>
                      )}
                      {done === undefined && !isFuture && !isPlaceholder && !noTradingWeekend && (
                        <span style={{ fontSize: 7, color: '#d4d4d8' }}>●</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}

        </div>
      </div>

      {/* Add habit form */}
      {addingTo && (
        <div className="flex gap-2 items-center">
          <div className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: SECTION_STYLES[addingTo].colBg }} />
          <span className="text-sm font-medium text-zinc-600 capitalize">{addingTo}:</span>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); if (e.key === 'Escape') setAddingTo(null) }}
            placeholder={`Nuevo hábito en ${addingTo}...`}
            autoFocus
            className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <button onClick={handleAddHabit} disabled={!newName.trim() || adding}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-black transition-colors">
            {adding ? '...' : 'Agregar'}
          </button>
          <button onClick={() => setAddingTo(null)}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
            Cancelar
          </button>
        </div>
      )}

    </div>
  )
}
