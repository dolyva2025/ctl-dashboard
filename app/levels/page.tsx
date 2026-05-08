'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/themeContext'
import { todayDate } from '@/lib/storage'
import * as api from '@/lib/api'
import type { Instrument, Level, LevelType } from '@/lib/storage'
import { LEVEL_TYPE_OPTIONS } from '@/lib/storage'
import { getCTLBias, saveCTLBias, getCTLLevels, addCTLLevel, deleteCTLLevel } from '@/lib/api'
import type { BiasEntry } from '@/lib/api'
import { isAdmin } from '@/lib/config'

// ── constants ─────────────────────────────────────────────────────────────────

const ACCENT = 'oklch(68% 0.19 42)'
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ']

const emptyBias = (): BiasEntry => ({ bias: '', setup: '', key_levels: '', avoid: '', notes: '' })

interface Setup {
  id: string
  ticker: string
  direction: 'Long' | 'Short' | ''
  entry: string
  stop: string
  target: string
  notes: string
}

interface UserWeeklyAnalysis {
  bias: string
  setup: string
  key_levels: string
  notes: string
}

const emptyWeekly = (): UserWeeklyAnalysis => ({ bias: '', setup: '', key_levels: '', notes: '' })

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekInfo(base: Date) {
  const dow = base.getDay()
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((dow + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() - 1)
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  return { days, sunday }
}

function lsKey(prefix: string, date: string) { return `ctl_pm_${prefix}_${date}` }
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function lsSet<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function biasColorFor(b: string) {
  if (b === 'Alcista') return 'oklch(72% 0.18 155)'
  if (b === 'Bajista') return 'oklch(65% 0.18 25)'
  return 'oklch(70% 0.17 240)'
}

function typeColor(type: string) {
  if (type === 'Soporte' || type === 'Support') return 'oklch(72% 0.18 155)'
  if (type === 'Resistencia' || type === 'Resistance') return 'oklch(65% 0.18 25)'
  return 'oklch(70% 0.17 240)'
}

// ── BiasPill ──────────────────────────────────────────────────────────────────

function BiasPill({ value }: { value: string }) {
  if (!value) return null
  const color = biasColorFor(value)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: `${color}20`, border: `1px solid ${color}50`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color }}>{value.toUpperCase()}</span>
    </div>
  )
}

// ── BiasButtons ───────────────────────────────────────────────────────────────

function BiasButtons({
  value, onChange, t, readOnly,
}: {
  value: string
  onChange: (v: string) => void
  t: ReturnType<typeof makeTokens>
  readOnly?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { label: '▲ Alcista', value: 'Alcista', color: 'oklch(72% 0.18 155)' },
        { label: '▼ Bajista', value: 'Bajista', color: 'oklch(65% 0.18 25)' },
        { label: '— Neutral', value: 'Neutral', color: 'oklch(70% 0.17 240)' },
      ].map(({ label, value: v, color }) => (
        <button
          key={v}
          onClick={() => !readOnly && onChange(value === v ? '' : v)}
          disabled={readOnly}
          style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: readOnly ? 'default' : 'pointer',
            background: value === v ? color : t.surf2,
            border: `1.5px solid ${value === v ? color : t.border}`,
            color: value === v ? '#0A0A0C' : t.text,
            opacity: readOnly && value !== v ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >{label}</button>
      ))}
    </div>
  )
}

// ── LevelsGrid ────────────────────────────────────────────────────────────────

function LevelsGrid({
  levels, onDelete, t, readOnly,
}: {
  levels: Level[]
  onDelete?: (id: string) => void
  t: ReturnType<typeof makeTokens>
  readOnly?: boolean
}) {
  if (levels.length === 0) return (
    <div style={{ textAlign: 'center', padding: '12px 0 16px', color: t.muted, fontSize: 13 }}>
      Sin niveles publicados
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 90px 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      {['INSTRUMENTO · TIPO', 'PRECIO', 'NOTAS', ''].map((h) => (
        <div key={h} style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', paddingBottom: 6 }}>{h}</div>
      ))}
      {[...levels].sort((a, b) => b.price - a.price).map((l) => {
        const col = typeColor(l.type)
        return (
          <>
            <div key={l.id + 't'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                {l.instrument} · {LEVEL_TYPE_OPTIONS.find(o => o.value === l.type)?.label ?? l.type}
              </span>
            </div>
            <span key={l.id + 'p'} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: t.text }}>
              {l.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span key={l.id + 'n'} style={{ fontSize: 12, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.notes ?? '—'}
            </span>
            {!readOnly && onDelete
              ? <button key={l.id + 'd'} onClick={() => onDelete(l.id)}
                  style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px', opacity: 0.6 }}>×</button>
              : <div key={l.id + 'd'} />
            }
          </>
        )
      })}
    </div>
  )
}

// ── theme tokens ──────────────────────────────────────────────────────────────

function makeTokens(isDark: boolean) {
  return {
    text:    isDark ? 'hsl(228 100% 95%)' : '#09090b',
    muted:   isDark ? 'hsl(228 30% 70%)' : '#71717a',
    border:  isDark ? 'hsl(228 30% 17%)' : '#e4e4e7',
    surface: isDark ? 'hsl(226 48% 11%)' : '#ffffff',
    surf2:   isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:  isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
    bg:      isDark ? 'hsl(231 60% 7%)' : 'hsl(0 0% 98%)',
  }
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function LevelsPage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'
  const t = makeTokens(isDark)

  const today = new Date()

  const [weekOffset, setWeekOffset] = useState(0)
  const [date, setDate] = useState(todayDate())
  const [mainTab, setMainTab] = useState<'ctl' | 'mia'>('ctl')
  const [ctlWeeklyOpen, setCtlWeeklyOpen] = useState(false)
  const [miaWeeklyOpen, setMiaWeeklyOpen] = useState(false)

  // CTL data
  const [ctlWeeklyEntry, setCtlWeeklyEntry] = useState<BiasEntry>(emptyBias())
  const [ctlDailyEntry, setCtlDailyEntry]   = useState<BiasEntry>(emptyBias())
  const [ctlLevels, setCtlLevels]           = useState<Level[]>([])

  // CTL levels add form
  const [ctlAddPrice, setCtlAddPrice]           = useState('')
  const [ctlAddType, setCtlAddType]             = useState<LevelType>('Support')
  const [ctlAddInstrument, setCtlAddInstrument] = useState<Instrument>('ES')
  const [ctlAddNotes, setCtlAddNotes]           = useState('')
  const [ctlSaving, setCtlSaving]               = useState(false)

  // User data
  const [userLevels, setUserLevels]     = useState<Level[]>([])
  const [addPrice, setAddPrice]         = useState('')
  const [addType, setAddType]           = useState<LevelType>('Support')
  const [addInstrument, setAddInstrument] = useState<Instrument>('ES')
  const [addNotes, setAddNotes]         = useState('')
  const [savingLevel, setSavingLevel]   = useState(false)

  const [setups, setSetups]             = useState<Setup[]>([])
  const [userWeekly, setUserWeekly]     = useState<UserWeeklyAnalysis>(emptyWeekly())
  const [weeklySaved, setWeeklySaved]   = useState(false)
  const [userDailyBias, setUserDailyBias] = useState<string>('')

  const weeklyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctlWeeklyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctlDailyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Compute week from offset
  const weekBase = new Date(today)
  weekBase.setDate(today.getDate() + weekOffset * 7)
  const { days: weekDays, sunday } = getWeekInfo(weekBase)
  const sundayStr = toDateStr(sunday)

  // ── load CTL data ────────────────────────────────────────────────────────────

  useEffect(() => {
    getCTLBias(sundayStr).then((d) => setCtlWeeklyEntry(d ?? emptyBias()))
  }, [sundayStr])

  useEffect(() => {
    getCTLBias(date).then((d) => setCtlDailyEntry(d ?? emptyBias()))
  }, [date])

  useEffect(() => {
    getCTLLevels(date).then(setCtlLevels)
  }, [date])

  // ── load user data ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    api.getLevels(user.id, date).then(setUserLevels)
  }, [user, date])

  useEffect(() => {
    setSetups(lsGet<Setup[]>(lsKey('setups', date), []))
  }, [date])

  useEffect(() => {
    setUserWeekly(lsGet<UserWeeklyAnalysis>(lsKey('user_weekly', sundayStr), emptyWeekly()))
    setWeeklySaved(false)
  }, [sundayStr])

  useEffect(() => {
    setUserDailyBias(lsGet<string>(lsKey('daily_bias', date), ''))
  }, [date])

  if (loading || !user) return null

  const admin = isAdmin(user.email)

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase())

  const card: React.CSSProperties = {
    background: t.surface, borderRadius: 14,
    border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 16, overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8,
    color: t.text, padding: '7px 10px', fontSize: 12, boxSizing: 'border-box',
    width: '100%', fontFamily: 'inherit',
  }

  const taStyle: React.CSSProperties = {
    ...inputStyle, fontSize: 13, padding: '8px 10px', resize: 'vertical', lineHeight: 1.6, minHeight: 72,
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, height: 34 }

  // ── CTL save handlers (admin only) ───────────────────────────────────────────

  function handleCTLWeeklyChange(key: keyof BiasEntry, val: string) {
    if (!admin) return
    const next = { ...ctlWeeklyEntry, [key]: val }
    setCtlWeeklyEntry(next)
    if (ctlWeeklyTimer.current) clearTimeout(ctlWeeklyTimer.current)
    ctlWeeklyTimer.current = setTimeout(() => saveCTLBias(sundayStr, next), 800)
  }

  function handleCTLDailyBiasChange(val: string) {
    if (!admin) return
    const next = { ...ctlDailyEntry, bias: ctlDailyEntry.bias === val ? '' : val }
    setCtlDailyEntry(next)
    if (ctlDailyTimer.current) clearTimeout(ctlDailyTimer.current)
    ctlDailyTimer.current = setTimeout(() => saveCTLBias(date, next), 400)
  }

  async function handleAddCTLLevel() {
    if (!admin || !ctlAddPrice.trim()) return
    const parsed = parseFloat(ctlAddPrice)
    if (isNaN(parsed)) return
    setCtlSaving(true)
    try {
      const l = await addCTLLevel(date, { instrument: ctlAddInstrument, price: parsed, type: ctlAddType, notes: ctlAddNotes.trim() || undefined })
      setCtlLevels((p) => [...p, l])
      setCtlAddPrice('')
      setCtlAddNotes('')
    } catch {}
    setCtlSaving(false)
  }

  async function handleDeleteCTLLevel(id: string) {
    if (!admin) return
    await deleteCTLLevel(id)
    setCtlLevels((p) => p.filter((l) => l.id !== id))
  }

  // ── user save handlers ───────────────────────────────────────────────────────

  async function handleAddLevel() {
    if (!user || !addPrice.trim()) return
    const parsed = parseFloat(addPrice)
    if (isNaN(parsed)) return
    setSavingLevel(true)
    try {
      const l = await api.addLevel(user.id, date, { instrument: addInstrument, price: parsed, type: addType, notes: addNotes.trim() || undefined })
      setUserLevels((p) => [...p, l])
      setAddPrice('')
      setAddNotes('')
    } catch {}
    setSavingLevel(false)
  }

  async function handleDeleteLevel(id: string) {
    await api.deleteLevel(id)
    setUserLevels((p) => p.filter((l) => l.id !== id))
  }

  function updateSetup(id: string, key: keyof Setup, value: string) {
    setSetups((p) => {
      const next = p.map((s) => s.id === id ? { ...s, [key]: value } : s)
      lsSet(lsKey('setups', date), next)
      return next
    })
  }

  function addSetup() {
    const next: Setup[] = [...setups, { id: String(Date.now()), ticker: 'ES', direction: '', entry: '', stop: '', target: '', notes: '' }]
    setSetups(next)
    lsSet(lsKey('setups', date), next)
  }

  function deleteSetup(id: string) {
    const next = setups.filter((s) => s.id !== id)
    setSetups(next)
    lsSet(lsKey('setups', date), next)
  }

  function handleWeeklyChange(key: keyof UserWeeklyAnalysis, val: string) {
    const next = { ...userWeekly, [key]: val }
    setUserWeekly(next)
    setWeeklySaved(false)
    if (weeklyTimer.current) clearTimeout(weeklyTimer.current)
    weeklyTimer.current = setTimeout(() => {
      lsSet(lsKey('user_weekly', sundayStr), next)
      setWeeklySaved(true)
    }, 800)
  }

  function handleDailyBiasChange(val: string) {
    const next = userDailyBias === val ? '' : val
    setUserDailyBias(next)
    lsSet(lsKey('daily_bias', date), next)
  }

  // ── shared section renders ───────────────────────────────────────────────────

  function renderWeeklySection(
    biasValue: string,
    onBiasChange: (v: string) => void,
    fields: { label: string; key: string; value: string; ph: string }[],
    onFieldChange: (key: string, val: string) => void,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    title: string,
    saved?: boolean,
    readOnly?: boolean,
  ) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: t.muted }}>NIVELES SEMANA</span>
          <div style={{ flex: 1, height: 1, background: t.border }} />
          <BiasPill value={biasValue} />
          {saved && <span style={{ fontSize: 11, color: 'oklch(72% 0.18 155)' }}>✓ Guardado</span>}
        </div>

        <div style={card}>
          <button
            onClick={() => setOpen(!isOpen)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: t.text }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'oklch(70% 0.17 240)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(70% 0.17 240)' }}>{title}</span>
            </div>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', color: t.muted, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {isOpen && (
            <div style={{ borderTop: `1px solid ${t.border}`, padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 8 }}>BIAS SEMANAL</div>
                <BiasButtons value={biasValue} onChange={onBiasChange} t={t} readOnly={readOnly} />
              </div>
              {fields.map(({ label, key, value, ph }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                  <textarea
                    value={value}
                    onChange={(e) => !readOnly && onFieldChange(key, e.target.value)}
                    readOnly={readOnly}
                    placeholder={readOnly ? '' : ph}
                    style={{ ...taStyle, opacity: readOnly ? 0.7 : 1 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderLevelAddForm(
    instrument: Instrument, setInstrument: (v: Instrument) => void,
    price: string, setPrice: (v: string) => void,
    type: LevelType, setType: (v: LevelType) => void,
    notes: string, setNotes: (v: string) => void,
    onAdd: () => void,
    saving: boolean,
  ) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>INSTRUMENTO</div>
          <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} style={{ ...selectStyle, width: 74 }}>
            {INSTRUMENTS.map((ins) => <option key={ins}>{ins}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>PRECIO</div>
          <input type="number" step="0.25" placeholder="ej. 5250.00"
            value={price} onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            style={{ ...inputStyle, width: 110 }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>TIPO</div>
          <select value={type} onChange={(e) => setType(e.target.value as LevelType)} style={{ ...selectStyle, width: 130 }}>
            {LEVEL_TYPE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>NOTAS</div>
          <input placeholder="Contexto del nivel..."
            value={notes} onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            style={inputStyle} />
        </div>
        <button onClick={onAdd} disabled={saving} style={{
          height: 34, padding: '0 16px', background: ACCENT, border: 'none',
          borderRadius: 8, color: '#0A0A0C', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {saving ? '...' : '+ Agregar'}
        </button>
      </div>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 0 40px', color: t.text, background: t.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: t.muted, marginBottom: 4 }}>PLANIFICACIÓN</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>Pre-Market Plan</h1>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{dateLabel}</div>
        </div>

        {/* Week strip with prev/next navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWeekOffset((o) => o - 1)} style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 7,
            color: t.muted, cursor: 'pointer', fontSize: 14, flexShrink: 0,
          }}>‹</button>
          <div style={{ display: 'flex', gap: 5 }}>
            {weekDays.map((d, i) => {
              const ds = toDateStr(d)
              const isSelected = ds === date
              const isToday = d.toDateString() === today.toDateString()
              return (
                <button key={i} onClick={() => setDate(ds)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: isSelected ? ACCENT : t.surf2,
                  outline: isSelected ? 'none' : `1px solid ${t.border}`,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: isSelected ? '#0A0A0C' : t.muted }}>{DAYS_SHORT[i]}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#0A0A0C' : t.text }}>{d.getDate()}</span>
                  {isToday && <div style={{ width: 3, height: 3, borderRadius: '50%', background: isSelected ? 'rgba(0,0,0,0.4)' : ACCENT }} />}
                </button>
              )
            })}
          </div>
          <button onClick={() => setWeekOffset((o) => o + 1)} style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 7,
            color: t.muted, cursor: 'pointer', fontSize: 14, flexShrink: 0,
          }}>›</button>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content',
      }}>
        {([['ctl', 'CTL'], ['mia', 'Mi Análisis']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMainTab(id)} style={{
            padding: '7px 20px', borderRadius: 7, fontSize: 13,
            fontWeight: mainTab === id ? 600 : 400, cursor: 'pointer', border: 'none',
            background: mainTab === id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
            color: mainTab === id ? t.text : t.muted,
            boxShadow: mainTab === id && !isDark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ══ CTL TAB ══════════════════════════════════════════════════════════════ */}
      {mainTab === 'ctl' && (
        <div>
          {/* SEMANAL */}
          {renderWeeklySection(
            ctlWeeklyEntry.bias,
            (v) => handleCTLWeeklyChange('bias', ctlWeeklyEntry.bias === v ? '' : v),
            [
              { label: 'SETUP PRINCIPAL', key: 'setup', value: ctlWeeklyEntry.setup, ph: '¿Qué setup busca CTL esta semana?' },
              { label: 'NIVELES CLAVE', key: 'key_levels', value: ctlWeeklyEntry.key_levels, ph: 'Los niveles más importantes de la semana...' },
              { label: 'NOTAS', key: 'notes', value: ctlWeeklyEntry.notes, ph: 'Contexto macro, noticias, observaciones...' },
            ],
            (key, val) => handleCTLWeeklyChange(key as keyof BiasEntry, val),
            ctlWeeklyOpen,
            setCtlWeeklyOpen,
            'COLLECTIVE TRADE LAB — ANÁLISIS SEMANAL',
            undefined,
            !admin,
          )}

          {/* DIARIOS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: t.muted }}>NIVELES DIARIOS</span>
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <BiasPill value={ctlDailyEntry.bias} />
            </div>

            <div style={card}>
              <div style={{ padding: '12px 20px', background: `${ACCENT}1a`, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT }}>PLAN DIARIO</span>
                </div>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Bias */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 8 }}>BIAS DIARIO</div>
                  <BiasButtons value={ctlDailyEntry.bias} onChange={handleCTLDailyBiasChange} t={t} readOnly={!admin} />
                </div>

                <div style={{ height: 1, background: t.border, marginBottom: 16 }} />

                {/* CTL Levels */}
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 8 }}>NIVELES CLAVE</div>
                {admin && renderLevelAddForm(
                  ctlAddInstrument, setCtlAddInstrument,
                  ctlAddPrice, setCtlAddPrice,
                  ctlAddType, setCtlAddType,
                  ctlAddNotes, setCtlAddNotes,
                  handleAddCTLLevel,
                  ctlSaving,
                )}
                {ctlLevels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0 16px', color: t.muted, fontSize: 13 }}>
                    {admin ? 'Agrega los niveles clave del día' : 'Sin niveles publicados para este día'}
                  </div>
                ) : (
                  <LevelsGrid levels={ctlLevels} onDelete={handleDeleteCTLLevel} t={t} readOnly={!admin} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MI ANÁLISIS TAB ══════════════════════════════════════════════════════ */}
      {mainTab === 'mia' && (
        <div>
          {/* SEMANAL */}
          {renderWeeklySection(
            userWeekly.bias,
            (v) => handleWeeklyChange('bias', userWeekly.bias === v ? '' : v),
            [
              { label: 'SETUP PRINCIPAL', key: 'setup', value: userWeekly.setup, ph: '¿Qué setup estás buscando esta semana?' },
              { label: 'NIVELES CLAVE', key: 'key_levels', value: userWeekly.key_levels, ph: 'Los niveles más importantes de la semana...' },
              { label: 'NOTAS LIBRES', key: 'notes', value: userWeekly.notes, ph: 'Contexto macro, noticias, observaciones...' },
            ],
            (key, val) => handleWeeklyChange(key as keyof UserWeeklyAnalysis, val),
            miaWeeklyOpen,
            setMiaWeeklyOpen,
            'MI ANÁLISIS SEMANAL',
            weeklySaved,
          )}

          {/* DIARIOS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: t.muted }}>NIVELES DIARIOS</span>
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <BiasPill value={userDailyBias} />
            </div>

            <div style={card}>
              <div style={{ padding: '12px 20px', background: `${ACCENT}1a`, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT }}>PLAN DIARIO</span>
                </div>
                <button onClick={addSetup} style={{
                  background: 'transparent', border: `1px solid ${t.border}`,
                  color: t.muted, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }}>+ Setup</button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Daily Bias */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 8 }}>BIAS DIARIO</div>
                  <BiasButtons value={userDailyBias} onChange={handleDailyBiasChange} t={t} />
                </div>

                <div style={{ height: 1, background: t.border, marginBottom: 16 }} />

                {/* User Levels */}
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 8 }}>NIVELES CLAVE</div>
                {renderLevelAddForm(
                  addInstrument, setAddInstrument,
                  addPrice, setAddPrice,
                  addType, setAddType,
                  addNotes, setAddNotes,
                  handleAddLevel,
                  savingLevel,
                )}
                {userLevels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0 16px', color: t.muted, fontSize: 13 }}>
                    Agrega tus niveles clave del día
                  </div>
                ) : (
                  <LevelsGrid levels={userLevels} onDelete={handleDeleteLevel} t={t} />
                )}

                <div style={{ height: 1, background: t.border, marginBottom: 16 }} />

                {/* Setups */}
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 10 }}>SETUPS PLANEADOS</div>
                {setups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: t.muted, fontSize: 13 }}>
                    Agrega los setups que estás planeando operar
                  </div>
                ) : setups.map((s) => (
                  <div key={s.id} style={{ background: t.surf2, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={s.ticker} onChange={(e) => updateSetup(s.id, 'ticker', e.target.value)} placeholder="Ticker" style={{ ...inputStyle, width: 80 }} />
                      {(['Long', 'Short'] as const).map((dir) => (
                        <button key={dir} onClick={() => updateSetup(s.id, 'direction', s.direction === dir ? '' : dir)} style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: s.direction === dir ? (dir === 'Long' ? 'oklch(72% 0.18 155)' : 'oklch(65% 0.18 25)') : t.surf2,
                          color: s.direction === dir ? '#0A0A0C' : t.muted,
                        }}>{dir === 'Long' ? '▲ Long' : '▼ Short'}</button>
                      ))}
                      <button onClick={() => deleteSetup(s.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {([['ENTRADA', 'entry', 'ej. 5250.25'], ['STOP', 'stop', 'ej. 5245.00'], ['TARGET', 'target', 'ej. 5262.50']] as const).map(([label, key, ph]) => (
                        <div key={key}>
                          <div style={{ fontSize: 10, color: t.muted, marginBottom: 4 }}>{label}</div>
                          <input value={s[key]} onChange={(e) => updateSetup(s.id, key, e.target.value)} placeholder={ph} style={inputStyle} />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: t.muted, marginBottom: 4 }}>NOTAS</div>
                    <input value={s.notes} onChange={(e) => updateSetup(s.id, 'notes', e.target.value)} placeholder="Descripción del setup, condiciones de entrada..." style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
