'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import * as api from '@/lib/api'
import { localDateStr } from '@/lib/storage'
import { useTheme } from '@/lib/themeContext'

// ── Colors ─────────────────────────────────────────────────────────────────────

const COLORS: Record<string, { main: string; dim: string; checkColor: string }> = {
  trading:   { main: 'oklch(68% 0.19 42)',  dim: 'oklch(68% 0.19 42 / 0.14)',  checkColor: '#0A0A0C' },
  salud:     { main: 'oklch(72% 0.18 155)', dim: 'oklch(72% 0.18 155 / 0.14)', checkColor: '#0A0A0C' },
  personal:  { main: 'oklch(70% 0.17 240)', dim: 'oklch(70% 0.17 240 / 0.14)', checkColor: '#0A0A0C' },
  proyectos: { main: 'oklch(68% 0.18 290)', dim: 'oklch(68% 0.18 290 / 0.14)', checkColor: '#ffffff' },
  educacion: { main: 'oklch(78% 0.17 88)',  dim: 'oklch(78% 0.17 88 / 0.14)',  checkColor: '#0A0A0C' },
}

const DARK_T = {
  bg: '#070A1C', surface: '#0E1428', surface2: '#162038',
  border: 'rgba(100,130,255,0.12)', text: '#E8EEFF', muted: '#6878B0',
}
const LIGHT_T = {
  bg: '#ffffff', surface: '#ffffff', surface2: '#f4f4f5',
  border: 'rgba(0,0,0,0.08)', text: '#111112', muted: '#8A8A97',
}

// ── Date helpers ───────────────────────────────────────────────────────────────

const DAYS_ES: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function pad(n: number) { return String(n).padStart(2, '0') }
function dkey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function isWeekend(dow: number) { return dow === 0 || dow === 6 }
function sinceDate() { const d = new Date(); d.setDate(d.getDate() - 120); return localDateStr(d) }

// ISO week number
function isoWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${pad(week)}`
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Section = 'trading' | 'salud' | 'personal' | 'proyectos' | 'educacion'

const DEFAULT_SECTION_LABELS: Record<Section, string> = {
  trading: 'TRADING', salud: 'SALUD', personal: 'PERSONAL',
  proyectos: 'PROYECTOS CREATIVOS', educacion: 'EDUCACIÓN',
}

const SECTIONS: Section[] = ['trading', 'salud', 'personal', 'proyectos', 'educacion']

const AUTO_HABITS = [
  { id: 'analysis', name: 'Pre-Mercado' },
  { id: 'prep',     name: 'Trading Prep' },
  { id: 'rules',    name: 'Reglas' },
  { id: 'journal',  name: 'Diario de Trading' },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export function HabitTracker({ userId }: { userId: string }) {
  const { theme } = useTheme()
  const T = theme === 'navy' ? DARK_T : LIGHT_T
  const isDark = theme === 'navy'

  const now = new Date()
  const [offset, setOffset]          = useState(0)
  const [analysisDates, setAnalysis]  = useState<string[]>([])
  const [prepDates, setPrep]          = useState<string[]>([])
  const [rulesDates, setRules]        = useState<string[]>([])
  const [journalDates, setJournal]    = useState<string[]>([])
  const [customHabits, setCustom]     = useState<api.CustomHabit[]>([])
  const [habitLogs, setHabitLogs]     = useState<Record<string, Record<string, boolean>>>({})
  const [addingTo, setAddingTo]       = useState<Section | null>(null)
  const [newName, setNewName]         = useState('')
  const [error, setError]             = useState<string | null>(null)

  // Editable habit names
  const [editingHabitId, setEditingHabitId]     = useState<string | null>(null)
  const [editingHabitName, setEditingHabitName] = useState('')
  const habitInputRef = useRef<HTMLInputElement>(null)

  // Editable section labels
  const [sectionLabels, setSectionLabels] = useState<Record<Section, string>>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_SECTION_LABELS }
    try {
      const saved = localStorage.getItem('ctl-section-labels')
      return saved ? { ...DEFAULT_SECTION_LABELS, ...JSON.parse(saved) } : { ...DEFAULT_SECTION_LABELS }
    } catch { return { ...DEFAULT_SECTION_LABELS } }
  })
  const [editingSection, setEditingSection]     = useState<Section | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const sectionInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingHabitId) habitInputRef.current?.focus() }, [editingHabitId])
  useEffect(() => { if (editingSection) sectionInputRef.current?.focus() }, [editingSection])

  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
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

  async function handleSaveHabitName(id: string) {
    const trimmed = editingHabitName.trim()
    if (!trimmed) { setEditingHabitId(null); return }
    setCustom(prev => prev.map(h => h.id === id ? { ...h, name: trimmed } : h))
    setEditingHabitId(null)
    try { await api.updateCustomHabit(id, trimmed) } catch (e) {
      setError(`Error al renombrar: ${e instanceof Error ? e.message : String(e)}`)
      await loadData()
    }
  }

  function handleSaveSectionLabel(sec: Section) {
    const trimmed = editingSectionName.trim().toUpperCase()
    if (!trimmed) { setEditingSection(null); return }
    const updated = { ...sectionLabels, [sec]: trimmed }
    setSectionLabels(updated)
    setEditingSection(null)
    try { localStorage.setItem('ctl-section-labels', JSON.stringify(updated)) } catch {}
  }

  // ── Weekly streak logic ───────────────────────────────────────────────────────
  // A week "counts" if ≥3 weekdays had at least one habit done.
  // Streak = consecutive qualifying weeks going back from the current week.

  function computeWeeklyStreak(): { cur: number; best: number } {
    const since = sinceDate()
    const sinceDate_ = new Date(since + 'T12:00:00')

    // Build a map: weekKey → Set of weekdays with ≥1 habit done
    const weekDays: Record<string, Set<number>> = {}

    const addDay = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00')
      if (d < sinceDate_) return
      const dow = d.getDay()
      if (isWeekend(dow)) return
      const wk = isoWeek(d)
      if (!weekDays[wk]) weekDays[wk] = new Set()
      weekDays[wk].add(d.getDate() * 100 + d.getMonth()) // unique day id
    }

    // Auto habits (trading, weekdays only)
    Object.values(autoSets).forEach(set => set.forEach(dk => addDay(dk)))

    // Custom habits
    customHabits.forEach(h => {
      Object.entries(habitLogs[h.id] ?? {}).forEach(([dk, done]) => {
        if (done) addDay(dk)
      })
    })

    const nowWeek = isoWeek(now)
    const allWeeks = Object.keys(weekDays).sort().reverse()

    // Current streak: consecutive weeks from current week backwards with ≥3 active days
    let cur = 0
    const weeks = allWeeks.filter(w => w <= nowWeek)
    for (const wk of weeks) {
      if ((weekDays[wk]?.size ?? 0) >= 3) cur++
      else break
    }

    // Best streak in the loaded history
    let best = 0, run = 0
    for (const wk of [...allWeeks].reverse()) {
      if ((weekDays[wk]?.size ?? 0) >= 3) { run++; best = Math.max(best, run) }
      else run = 0
    }

    return { cur, best }
  }

  const { cur: curStr, best: bestStr } = computeWeeklyStreak()

  // Monthly completion rate
  const maxDay = isCurMonth ? now.getDate() : days
  let tot = 0, dn = 0
  for (let d = 1; d <= maxDay; d++) {
    const dk = dkey(year, month, d)
    const dow = new Date(year, month, d).getDay()
    AUTO_HABITS.forEach(h => { if (!isWeekend(dow)) { tot++; if (autoSets[h.id]?.has(dk)) dn++ } })
    customHabits.forEach(h => { tot++; if (habitLogs[h.id]?.[dk]) dn++ })
  }
  const rate = tot > 0 ? Math.round((dn / tot) * 100) : 0

  // ── Render ───────────────────────────────────────────────────────────────────

  const accent = 'oklch(68% 0.19 42)'
  const SEC_H  = 42

  return (
    <div style={{ background: T.bg, borderRadius: 16, padding: '28px 24px', color: T.text, maxWidth: '80%', margin: '0 auto' }}>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#fca5a5' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: T.muted, marginBottom: 4 }}>DISCIPLINA</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{MONTHS_ES[month]} de {year}</h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Consistencia es tu ventaja</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOffset(o => o - 1)} style={{ width: 34, height: 34, borderRadius: 8, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => !isCurMonth && setOffset(o => o + 1)} style={{ width: 34, height: 34, borderRadius: 8, background: T.surface2, border: `1px solid ${T.border}`, color: isCurMonth ? T.muted : T.text, cursor: isCurMonth ? 'default' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          ['TASA MENSUAL', `${rate}%`,   `${dn}/${tot} hábitos`],
          ['RACHA ACTUAL', `${curStr}sem`, curStr > 0 ? '🔥 semanas seguidas' : 'sin racha activa'],
          ['MEJOR RACHA',  `${bestStr}sem`, '≥3 días por semana'],
        ] as const).map(([label, val, sub]) => (
          <div key={label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 18px', minWidth: 130 }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: T.text }}>{val}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Add habit form */}
      {addingTo && (
        <div style={{ background: T.surface2, border: `1px solid ${COLORS[addingTo].main}40`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: COLORS[addingTo].main, fontWeight: 700, letterSpacing: '0.08em' }}>{sectionLabels[addingTo]}</span>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); if (e.key === 'Escape') { setAddingTo(null); setNewName('') } }}
            placeholder="Nombre del hábito..."
            style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 6, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
          <button onClick={handleAddHabit} disabled={!newName.trim()}
            style={{ background: COLORS[addingTo].main, color: '#0a0a0c', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: newName.trim() ? 1 : 0.4 }}>Agregar</button>
          <button onClick={() => { setAddingTo(null); setNewName('') }}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
      )}

      {/* Grid */}
      <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)', minHeight: 300 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              {/* ── Section header row ── */}
              <tr>
                <th style={{ width: 39, minWidth: 39, background: T.surface, position: 'sticky', left: 0, top: 0, zIndex: 5, borderBottom: `1px solid ${T.border}`, height: SEC_H }} />
                {SECTIONS.map(sec => {
                  const c = COLORS[sec]
                  const habits = sec === 'trading' ? AUTO_HABITS : customHabits.filter(h => h.section === sec)
                  const colSpan = sec === 'trading' ? habits.length : habits.length + 1
                  return (
                    <th key={sec} colSpan={colSpan} style={{
                      padding: '0 12px', background: T.surface,
                      borderBottom: `2px solid ${c.main}`,
                      borderRight: `1px solid ${T.border}`,
                      textAlign: 'left', height: SEC_H,
                      position: 'sticky', top: 0, zIndex: 4,
                    }}>
                      {editingSection === sec ? (
                        <input
                          ref={sectionInputRef}
                          value={editingSectionName}
                          onChange={e => setEditingSectionName(e.target.value)}
                          onBlur={() => handleSaveSectionLabel(sec)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveSectionLabel(sec); if (e.key === 'Escape') setEditingSection(null) }}
                          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: c.main, background: 'transparent', border: 'none', outline: `1px solid ${c.main}`, borderRadius: 4, padding: '2px 4px', width: '100%' }}
                        />
                      ) : (
                        <span
                          title="Doble click para editar"
                          onDoubleClick={() => { if (sec !== 'trading') { setEditingSection(sec); setEditingSectionName(sectionLabels[sec]) } }}
                          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: c.main, cursor: sec !== 'trading' ? 'text' : 'default', userSelect: 'none' }}
                        >
                          {sectionLabels[sec]}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>

              {/* ── Habit column headers ── */}
              <tr>
                <th style={{ width: 39, minWidth: 39, background: T.surface, position: 'sticky', left: 0, top: SEC_H, zIndex: 5, borderBottom: `1px solid ${T.border}`, padding: '8px 5px', fontSize: 10, color: T.muted, fontWeight: 500, letterSpacing: '0.08em', textAlign: 'left' }}>
                  DÍA
                </th>
                {SECTIONS.map(sec => {
                  const c = COLORS[sec]
                  const habits = sec === 'trading' ? AUTO_HABITS : customHabits.filter(h => h.section === sec)
                  return [
                    ...habits.map(h => (
                      <th key={h.id} style={{ width: 38, minWidth: 38, padding: '4px 2px', background: T.surface, borderBottom: `1px solid ${T.border}`, borderTop: `3px solid ${c.main}`, textAlign: 'center', verticalAlign: 'bottom', position: 'sticky', top: SEC_H, zIndex: 4 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          {editingHabitId === h.id ? (
                            <input
                              ref={habitInputRef}
                              value={editingHabitName}
                              onChange={e => setEditingHabitName(e.target.value)}
                              onBlur={() => handleSaveHabitName(h.id)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveHabitName(h.id); if (e.key === 'Escape') setEditingHabitId(null) }}
                              style={{ width: 30, fontSize: 10, background: T.surface2, border: `1px solid ${c.main}`, color: T.text, borderRadius: 4, padding: '2px 3px', outline: 'none', textAlign: 'center' }}
                            />
                          ) : (
                            <div
                              title={sec !== 'trading' ? 'Doble click para editar' : h.name}
                              onDoubleClick={() => { if (sec !== 'trading') { setEditingHabitId(h.id); setEditingHabitName(h.name) } }}
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', maxHeight: 90, overflow: 'hidden', cursor: sec !== 'trading' ? 'text' : 'default' }}
                            >
                              {h.name}
                            </div>
                          )}
                          {sec !== 'trading' && (
                            <button onClick={() => handleDeleteHabit(h.id)}
                              style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12, opacity: 0.4, lineHeight: 1, padding: '1px 2px' }}
                              title="Eliminar">×</button>
                          )}
                        </div>
                      </th>
                    )),
                    sec !== 'trading' && (
                      <th key={sec + '-add'} style={{ width: 28, minWidth: 28, background: T.surface, borderBottom: `1px solid ${T.border}`, borderTop: `3px solid ${c.main}`, borderRight: `1px solid ${T.border}`, textAlign: 'center', padding: 4, position: 'sticky', top: SEC_H, zIndex: 4 }}>
                        <button onClick={() => { setAddingTo(sec); setNewName('') }}
                          style={{ background: 'transparent', border: `1px dashed ${c.main}`, color: c.main, borderRadius: 6, width: 19, height: 19, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', opacity: 0.7 }}>+</button>
                      </th>
                    ),
                  ]
                })}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1
                const d   = new Date(year, month, day)
                const dow = d.getDay()
                const weekend  = isWeekend(dow)
                const isToday  = isCurMonth && now.getDate() === day
                const isFuture = isCurMonth && day > now.getDate()
                const dk = dkey(year, month, day)

                return (
                  <tr key={day} style={{ background: isToday ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent' }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 2, background: isToday ? T.surface2 : T.surface, padding: '3px 5px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, color: isToday ? accent : T.muted, fontWeight: isToday ? 700 : 400 }}>{DAYS_ES[dow]} </span>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? T.text : T.muted }}>{day}</span>
                    </td>

                    {SECTIONS.map(sec => {
                      const c = COLORS[sec]
                      const habits = sec === 'trading' ? AUTO_HABITS : customHabits.filter(h => h.section === sec)
                      return [
                        ...habits.map(h => {
                          const disabled = isFuture || (sec === 'trading' && weekend)
                          const done = sec === 'trading' ? autoSets[h.id]?.has(dk) ?? false : !!(habitLogs[h.id]?.[dk])
                          const canClick = !disabled && sec !== 'trading'
                          return (
                            <td key={h.id} style={{ padding: '3px 2px', borderBottom: `1px solid ${T.border}`, background: c.dim, textAlign: 'center' }}>
                              {disabled ? (
                                <div style={{ width: 30, height: 30, borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', margin: '0 auto' }} />
                              ) : (
                                <div onClick={() => canClick && handleToggle(h.id, dk)} style={{ width: 30, height: 30, borderRadius: 6, margin: '0 auto', background: done ? c.main : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: isToday && !done ? `1.5px solid ${c.main}` : `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canClick ? 'pointer' : 'default', transition: 'all 0.12s' }}>
                                  {done ? (
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                      <polyline points="2,7 5.5,10.5 12,3.5" stroke={c.checkColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : !isFuture ? (
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                                  ) : null}
                                </div>
                              )}
                            </td>
                          )
                        }),
                        sec !== 'trading' && (
                          <td key={sec + '-sp'} style={{ width: 28, background: c.dim, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }} />
                        ),
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
