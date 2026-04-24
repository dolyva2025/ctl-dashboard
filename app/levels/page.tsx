'use client'

import { useState, useEffect, useRef } from 'react'
import { CTLLevels } from '@/components/CTLLevels'
import { CTLBias } from '@/components/CTLBias'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/themeContext'
import { todayDate } from '@/lib/storage'
import * as api from '@/lib/api'
import type { Instrument, Level, LevelType } from '@/lib/storage'
import { LEVEL_TYPE_OPTIONS } from '@/lib/storage'

// ── constants ─────────────────────────────────────────────────────────────────

const ACCENT = 'oklch(68% 0.19 42)'
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ']


interface Setup {
  id: string
  ticker: string
  direction: 'Long' | 'Short' | ''
  entry: string
  stop: string
  target: string
  notes: string
}

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

function lsKey(prefix: string, date: string) {
  return `ctl_pm_${prefix}_${date}`
}

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}

function lsSet<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function LevelsPage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'

  const [date, setDate] = useState(todayDate())
  const [ctlOpen, setCtlOpen] = useState(true)

  // Personal plan state
  const [userLevels, setUserLevels] = useState<Level[]>([])
  const [addPrice, setAddPrice] = useState('')
  const [addType, setAddType] = useState<LevelType>('Support')
  const [addInstrument, setAddInstrument] = useState<Instrument>('ES')
  const [addNotes, setAddNotes] = useState('')
  const [savingLevel, setSavingLevel] = useState(false)

  const [setups, setSetups] = useState<Setup[]>([])
  const [planNotes, setPlanNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load user levels from DB
  useEffect(() => {
    if (!user) return
    api.getLevels(user.id, date).then(setUserLevels)
  }, [user, date])

  // Load setups + notes from localStorage
  useEffect(() => {
    setSetups(lsGet<Setup[]>(lsKey('setups', date), []))
    setPlanNotes(lsGet<string>(lsKey('notes', date), ''))
    setNotesSaved(false)
  }, [date])

  if (loading || !user) return null

  const today = new Date()
  const { days: weekDays, sunday } = getWeekInfo(today)
  const sundayStr = toDateStr(sunday)
  const isViewingSunday = date === sundayStr
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase())

  // Theme tokens
  const t = {
    text:   isDark ? 'hsl(228 100% 95%)' : '#09090b',
    muted:  isDark ? 'hsl(228 30% 55%)' : '#71717a',
    border: isDark ? 'hsl(228 30% 17%)' : '#e4e4e7',
    surface: isDark ? 'hsl(226 48% 11%)' : '#ffffff',
    surf2:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  }

  const card: React.CSSProperties = {
    background: t.surface, borderRadius: 14,
    border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 16, overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8,
    color: t.text, padding: '7px 10px', fontSize: 12, boxSizing: 'border-box',
    width: '100%',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, height: 34 }

  // ── personal levels ────────────────────────────────────────────────────────

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

  // ── setups ─────────────────────────────────────────────────────────────────

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

  function handleNotesChange(val: string) {
    setPlanNotes(val)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      lsSet(lsKey('notes', date), val)
      setNotesSaved(true)
    }, 800)
  }

  // ── level type badge color ─────────────────────────────────────────────────

  function typeColor(type: string) {
    if (type === 'Soporte' || type === 'Support') return 'oklch(72% 0.18 155)'
    if (type === 'Resistencia' || type === 'Resistance') return 'oklch(65% 0.18 25)'
    return 'oklch(70% 0.17 240)'
  }

  function Chevron({ open }: { open: boolean }) {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', color: t.muted, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
      </svg>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 0 40px', color: t.text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: t.muted, marginBottom: 4 }}>PLANIFICACIÓN</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>Pre-Market Plan</h1>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{dateLabel}</div>
        </div>

        {/* Week strip */}
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
      </div>

      {/* ── Weekly Prep (always at top, collapsible) ───────────────────────── */}
      {!isViewingSunday && (
        <div style={{ ...card, borderStyle: 'dashed' }}>
          <button
            onClick={() => setCtlOpen((v) => !v)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: t.text }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(70% 0.17 240)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: t.text }}>WEEKLY PREP — COLLECTIVE TRADE LAB</span>
            </div>
            <Chevron open={ctlOpen} />
          </button>
          {ctlOpen && (
            <div style={{ borderTop: `1px solid ${t.border}`, padding: 20 }}>
              <CTLBias date={sundayStr} userEmail={user.email} hideHeader />
              <div style={{ height: 1, background: t.border, margin: '20px 0' }} />
              <CTLLevels date={sundayStr} userEmail={user.email} hideHeader />
            </div>
          )}
        </div>
      )}

      {/* ── Daily CTL Analysis ─────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ padding: '13px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: t.text }}>ANÁLISIS COLLECTIVE TRADE LAB</span>
        </div>
        <div style={{ padding: 20 }}>
          <CTLBias date={date} userEmail={user.email} hideHeader />
          <div style={{ height: 1, background: t.border, margin: '20px 0' }} />
          <CTLLevels date={date} userEmail={user.email} hideHeader />
        </div>
      </div>

      {/* ── Personal plan (only on weekdays) ──────────────────────────────── */}
      {!isViewingSunday && (
        <>
          {/* Key Levels */}
          <div style={card}>
            <div style={{ padding: '12px 20px', background: 'oklch(68% 0.19 42 / 0.12)', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(68% 0.19 42)' }}>MIS NIVELES CLAVE</span>
            </div>
            {/* Add form */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>INSTRUMENTO</div>
                <select value={addInstrument} onChange={(e) => setAddInstrument(e.target.value as Instrument)} style={{ ...selectStyle, width: 74 }}>
                  {INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>NIVEL CLAVE</div>
                <input type="number" step="0.25" placeholder="ej. 5250.00"
                  value={addPrice} onChange={(e) => setAddPrice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
                  style={{ ...inputStyle, width: 110 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>TIPO</div>
                <select value={addType} onChange={(e) => setAddType(e.target.value as LevelType)} style={{ ...selectStyle, width: 130 }}>
                  {LEVEL_TYPE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 4 }}>NOTAS</div>
                <input placeholder="Contexto del nivel..."
                  value={addNotes} onChange={(e) => setAddNotes(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
                  style={inputStyle} />
              </div>
              <button onClick={handleAddLevel} disabled={savingLevel} style={{
                height: 34, padding: '0 16px', background: ACCENT, border: 'none',
                borderRadius: 8, color: '#0A0A0C', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {savingLevel ? '...' : '+ Agregar'}
              </button>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {userLevels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: t.muted, fontSize: 13 }}>
                  Agrega tus niveles clave del día
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 90px 1fr auto', gap: 8, alignItems: 'center' }}>
                  {['INSTRUMENTO · TIPO', 'PRECIO', 'NOTAS', ''].map((h) => (
                    <div key={h} style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', paddingBottom: 6 }}>{h}</div>
                  ))}
                  {[...userLevels].sort((a, b) => b.price - a.price).map((l) => {
                    const col = typeColor(l.type)
                    return (
                      <>
                        <div key={l.id + 'type'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                            {l.instrument} · {LEVEL_TYPE_OPTIONS.find(o => o.value === l.type)?.label ?? l.type}
                          </span>
                        </div>
                        <span key={l.id + 'price'} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: t.text }}>
                          {l.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span key={l.id + 'notes'} style={{ fontSize: 12, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.notes ?? '—'}
                        </span>
                        <button key={l.id + 'del'} onClick={() => handleDeleteLevel(l.id)}
                          style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px', opacity: 0.6 }}>×</button>
                      </>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Setups Planeados */}
          <div style={card}>
            <div style={{ padding: '12px 20px', background: 'oklch(70% 0.17 240 / 0.12)', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(70% 0.17 240)' }}>SETUPS PLANEADOS</span>
              <button
                onClick={addSetup}
                style={{
                  background: 'transparent', border: '1px solid oklch(70% 0.17 240 / 0.4)',
                  color: 'oklch(70% 0.17 240)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }}
              >
                + Setup
              </button>
            </div>
            <div style={{ padding: 14 }}>
              {setups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: t.muted, fontSize: 13 }}>
                  Agrega los setups que estás planeando operar
                </div>
              ) : (
                setups.map((s) => (
                  <div key={s.id} style={{ background: t.surf2, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={s.ticker} onChange={(e) => updateSetup(s.id, 'ticker', e.target.value)}
                        placeholder="Ticker"
                        style={{ ...inputStyle, width: 80 }}
                      />
                      {(['Long', 'Short'] as const).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => updateSetup(s.id, 'direction', s.direction === dir ? '' : dir)}
                          style={{
                            padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', border: 'none',
                            background: s.direction === dir
                              ? (dir === 'Long' ? 'oklch(72% 0.18 155)' : 'oklch(65% 0.18 25)')
                              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                            color: s.direction === dir ? '#0A0A0C' : t.muted,
                          }}
                        >
                          {dir === 'Long' ? '▲ Long' : '▼ Short'}
                        </button>
                      ))}
                      <button
                        onClick={() => deleteSetup(s.id)}
                        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                      >×</button>
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
                ))
              )}
            </div>
          </div>

          {/* Notes */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>NOTAS GENERALES</span>
              {notesSaved && <span style={{ color: 'oklch(72% 0.18 155)', fontSize: 11 }}>✓ Guardado</span>}
            </div>
            <textarea
              value={planNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Observaciones adicionales del mercado, contexto macro, catalizadores..."
              rows={3}
              style={{
                ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 13,
                minHeight: 80, fontFamily: 'inherit',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
