'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/themeContext'
import { todayDate } from '@/lib/storage'
import * as api from '@/lib/api'
import type { Trade } from '@/lib/storage'

// ── helpers ───────────────────────────────────────────────────────────────────

const ACCENT  = 'oklch(68% 0.19 42)'
const MOODS   = ['😴', '😰', '😐', '😊', '🔥']
const SESGOS  = [
  { label: '▲ Alcista', value: 'Alcista', color: 'oklch(72% 0.18 155)' },
  { label: '▼ Bajista', value: 'Bajista', color: 'oklch(65% 0.18 25)' },
  { label: '— Neutral', value: 'Neutral', color: 'oklch(68% 0.17 240)' },
]
const REGLAS_OPTS = [
  { label: 'Sí',           color: 'oklch(72% 0.18 155)' },
  { label: 'No',           color: 'oklch(65% 0.18 25)'  },
  { label: 'Parcialmente', color: 'oklch(78% 0.17 88)'  },
]
const INSTRUMENTS = ['ES', 'NQ', 'MES', 'MNQ']
const TICK_VALUES: Record<string, number> = { ES: 12.5, NQ: 5, MES: 1.25, MNQ: 0.5 }
const ACCOUNT_TABS = ['Evaluación', 'Funded', 'Personal'] as const
type AccountTab = typeof ACCOUNT_TABS[number]
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function parsePnl(text: string): number {
  const sign = text.trim().startsWith('-') ? -1 : 1
  const num = parseFloat(text.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? 0 : Math.abs(num) * sign
}

function calcPnl(instrument: string, entrada: string, salida: string): string {
  const entry = parseFloat(entrada)
  const exit = parseFloat(salida)
  if (isNaN(entry) || isNaN(exit) || entry === 0 || exit === 0) return ''
  const tickVal = TICK_VALUES[instrument] ?? 12.5
  const pnl = ((exit - entry) / 0.25) * tickVal
  return pnl >= 0 ? String(Math.round(pnl * 100) / 100) : String(Math.round(pnl * 100) / 100)
}

function formatPnl(n: number): string {
  if (n === 0) return '$0'
  return `${n > 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function pnlColor(n: number, muted: string): string {
  if (n > 0) return 'oklch(72% 0.18 155)'
  if (n < 0) return 'oklch(65% 0.18 25)'
  return muted
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7) + weekOffset * 7)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function weekLabel(days: Date[]): string {
  const start = days[0]
  const end = days[4]
  const sm = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const em = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${sm} — ${em}`
}

interface EntryForm {
  date: string
  mood: string
  titulo: string
  pnlText: string
  sesgo: string
  instrument: string
  entrada: string
  salida: string
  stop: string
  quePaso: string
  reglas: string
  notas: string
  aprendizaje: string
}

function emptyForm(date: string): EntryForm {
  return {
    date, mood: '😐', titulo: '', pnlText: '', sesgo: '',
    instrument: 'ES', entrada: '', salida: '', stop: '',
    quePaso: '', reglas: '', notas: '', aprendizaje: '',
  }
}

function packReflection(form: EntryForm): string {
  return JSON.stringify({
    quePaso: form.quePaso,
    reglas: form.reglas,
    notas: form.notas,
    aprendizaje: form.aprendizaje,
  })
}

function unpackReflection(r: string | undefined): { quePaso: string; reglas: string; notas: string; aprendizaje: string } {
  try { if (r) return { notas: '', ...JSON.parse(r) } } catch {}
  return { quePaso: r ?? '', reglas: '', notas: '', aprendizaje: '' }
}

function tradeToForm(e: Trade): EntryForm {
  const ref = unpackReflection(e.reflection)
  return {
    date:       e.date,
    mood:       e.emotions ?? '😐',
    titulo:     e.notes ?? '',
    pnlText:    e.pnl !== 0 ? String(Math.abs(e.pnl)) : '',
    sesgo:      e.rule_adherence ?? '',
    instrument: e.instrument ?? 'ES',
    entrada:    e.entry  !== 0 ? String(e.entry)  : '',
    salida:     e.exit   !== 0 ? String(e.exit)   : '',
    stop:       e.stop   !== 0 ? String(e.stop)   : '',
    quePaso:    ref.quePaso,
    reglas:     ref.reglas,
    notas:      ref.notas,
    aprendizaje: ref.aprendizaje,
  }
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'

  const [entries, setEntries] = useState<Trade[]>([])
  const [accountTab, setAccountTab] = useState<AccountTab>('Evaluación')
  const [tab, setTab] = useState<'semanal' | 'historial'>('semanal')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<EntryForm>(emptyForm(todayDate()))
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EntryForm>(emptyForm(todayDate()))

  useEffect(() => {
    if (!user) return
    api.getTrades(user.id).then(setEntries)
  }, [user])

  if (loading || !user) return null
  const userId = user.id

  // Theme tokens
  const text    = isDark ? 'hsl(228 100% 95%)' : '#09090b'
  const muted   = isDark ? 'hsl(228 30% 55%)' : '#71717a'
  const border  = isDark ? 'hsl(228 30% 17%)' : '#e4e4e7'
  const surface = isDark ? 'hsl(226 48% 11%)' : '#ffffff'
  const surf2   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const shadow  = isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'

  const card: React.CSSProperties = {
    background: surface, borderRadius: 12, border: `1px solid ${border}`,
    boxShadow: shadow, marginBottom: 10, overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    background: inputBg, border: `1px solid ${border}`, borderRadius: 8,
    color: text, padding: '8px 11px', fontSize: 13, width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  const taStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: 72,
  }

  const label11: React.CSSProperties = {
    fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 6,
  }

  function upd(key: keyof EntryForm, val: string) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  function updEdit(key: keyof EntryForm, val: string) {
    setEditForm((p) => ({ ...p, [key]: val }))
  }

  function startEdit(e: Trade) {
    setEditingId(e.id)
    setEditForm(tradeToForm(e))
    setOpenId(e.id)
  }

  async function handleUpdate() {
    if (!editForm.titulo.trim() || !editingId) return
    setSaving(true)
    try {
      const originalEntry = entries.find((e) => e.id === editingId)
      const updated = await api.updateTrade(editingId, {
        date:           editForm.date,
        instrument:     editForm.instrument as Trade['instrument'],
        direction:      'Long',
        entry:          parseFloat(editForm.entrada) || 0,
        stop:           parseFloat(editForm.stop) || 0,
        target:         0,
        exit:           parseFloat(editForm.salida) || 0,
        pnl:            parsePnl(editForm.pnlText),
        account_type:   originalEntry?.account_type ?? accountTab,
        emotions:       editForm.mood,
        notes:          editForm.titulo,
        rule_adherence: editForm.sesgo || undefined,
        reflection:     packReflection(editForm),
      })
      setEntries((p) => p.map((e) => (e.id === editingId ? updated : e)))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  // ── filtered entries by account tab ──────────────────────────────────────

  const filteredEntries = entries.filter(e => (e.account_type ?? 'Personal') === accountTab)

  // ── week data ─────────────────────────────────────────────────────────────

  const weekDays = getWeekDays(weekOffset)
  const today = new Date()
  const isCurrentWeek = weekOffset === 0

  // Entries for the current week view
  const weekDateStrs = weekDays.map(toDateStr)
  const weekEntries = filteredEntries.filter(e => weekDateStrs.includes(e.date))

  // Entries by date (for week grid)
  const entriesByDate: Record<string, Trade[]> = {}
  weekDateStrs.forEach(d => { entriesByDate[d] = [] })
  weekEntries.forEach(e => { entriesByDate[e.date]?.push(e) })

  // Weekly P&L summary
  const weekPnl = weekEntries.reduce((sum, e) => sum + e.pnl, 0)
  const weekSessions = weekEntries.length
  const weekWins = weekEntries.filter(e => e.pnl > 0).length

  // Entries for selected day (semanal detail view)
  const dayEntries = selectedDay ? (entriesByDate[selectedDay] ?? []) : []

  // ── actions ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      const newTrade = await api.addTrade(userId, {
        date:           form.date,
        instrument:     form.instrument as Trade['instrument'],
        direction:      'Long',
        entry:          parseFloat(form.entrada) || 0,
        stop:           parseFloat(form.stop) || 0,
        target:         0,
        exit:           parseFloat(form.salida) || 0,
        pnl:            parsePnl(form.pnlText),
        account_type:   accountTab,
        emotions:       form.mood,
        notes:          form.titulo,
        rule_adherence: form.sesgo || undefined,
        reflection:     packReflection(form),
      })
      setEntries((p) => [newTrade, ...p])
      setAdding(false)
      setForm(emptyForm(todayDate()))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await api.deleteTrade(id)
    setEntries((p) => p.filter((e) => e.id !== id))
    if (openId === id) setOpenId(null)
  }

  const sesgoBadgeColor = (sesgo: string | undefined) => {
    if (sesgo === 'Alcista') return 'oklch(72% 0.18 155)'
    if (sesgo === 'Bajista') return 'oklch(65% 0.18 25)'
    return 'oklch(68% 0.17 240)'
  }

  const reglasBadgeColor = (r: string) => {
    if (r === 'Sí') return 'oklch(72% 0.18 155)'
    if (r === 'No') return 'oklch(65% 0.18 25)'
    if (r === 'Parcialmente') return 'oklch(78% 0.17 88)'
    return muted
  }

  // ── entry card (reused in both tabs) ──────────────────────────────────────

  function renderEntryCard(e: Trade) {
    const isOpen = openId === e.id
    const ref = unpackReflection(e.reflection)
    const dateLabel = new Date(e.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const hasPnl = e.pnl !== 0
    const pColor = pnlColor(e.pnl, muted)
    const hasPrice = e.entry !== 0 || e.exit !== 0

    return (
      <div style={card}>
        <div
          onClick={() => setOpenId(isOpen ? null : e.id)}
          style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        >
          <div style={{ fontSize: 26, flexShrink: 0 }}>{e.emotions ?? '😐'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.notes || 'Sin título'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: muted }}>{dateLabel}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 5, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: muted }}>
                {e.instrument}
              </span>
              {e.rule_adherence && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 5, background: sesgoBadgeColor(e.rule_adherence) + '22', color: sesgoBadgeColor(e.rule_adherence) }}>
                  {e.rule_adherence.toUpperCase()}
                </span>
              )}
              {ref.reglas && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 5, background: reglasBadgeColor(ref.reglas) + '22', color: reglasBadgeColor(ref.reglas) }}>
                  {ref.reglas.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {hasPnl && (
            <div style={{ fontSize: 16, fontWeight: 800, color: pColor, flexShrink: 0 }}>{formatPnl(e.pnl)}</div>
          )}
          <div style={{ color: muted, fontSize: 11, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</div>
        </div>

        {isOpen && editingId === e.id && (
          <div style={{ padding: '20px 24px', borderTop: `1px solid ${border}` }}>
            <div style={{ marginBottom: 20 }}>
              <div style={label11}>FECHA DE LA SESIÓN</div>
              <input type="date" value={editForm.date} onChange={(ev) => updEdit('date', ev.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={label11}>ESTADO DE ÁNIMO</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {MOODS.map((m) => (
                  <button key={m} onClick={() => updEdit('mood', m)} style={{
                    fontSize: 24,
                    background: editForm.mood === m ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
                    border: `2px solid ${editForm.mood === m ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') : 'transparent'}`,
                    borderRadius: 10, padding: '5px 9px', cursor: 'pointer',
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={label11}>TÍTULO / RESUMEN</div>
                <input value={editForm.titulo} onChange={(ev) => updEdit('titulo', ev.target.value)} placeholder="ej. Buen día, seguí el plan" style={inputStyle} />
              </div>
              <div>
                <div style={label11}>P&amp;L</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={editForm.pnlText} onChange={(ev) => updEdit('pnlText', ev.target.value)} placeholder="+$320" style={{ ...inputStyle, width: 90 }} />
                  <button
                    onClick={() => { const v = calcPnl(editForm.instrument, editForm.entrada, editForm.salida); if (v) updEdit('pnlText', v) }}
                    title="Calcular desde entrada/salida"
                    style={{ height: 34, padding: '0 8px', background: surf2, border: `1px solid ${border}`, borderRadius: 7, color: muted, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >Calc</button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={label11}>SESGO DE LA SESIÓN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SESGOS.map(({ label: lbl, value, color }) => (
                  <button key={value} onClick={() => updEdit('sesgo', editForm.sesgo === value ? '' : value)} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: editForm.sesgo === value ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: editForm.sesgo === value ? '#0A0A0C' : muted,
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 90 }}>
                <div style={label11}>INSTRUMENTO</div>
                <select value={editForm.instrument} onChange={(ev) => updEdit('instrument', ev.target.value)} style={{ ...inputStyle, width: 'auto', paddingRight: 8 }}>
                  {INSTRUMENTS.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={label11}>ENTRADA</div>
                <input type="number" value={editForm.entrada} onChange={(ev) => updEdit('entrada', ev.target.value)} placeholder="5280.00" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={label11}>SALIDA</div>
                <input type="number" value={editForm.salida} onChange={(ev) => updEdit('salida', ev.target.value)} placeholder="5290.00" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={label11}>STOP</div>
                <input type="number" value={editForm.stop} onChange={(ev) => updEdit('stop', ev.target.value)} placeholder="5275.00" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={label11}>¿QUÉ PASÓ?</div>
              <textarea value={editForm.quePaso} onChange={(ev) => updEdit('quePaso', ev.target.value)} placeholder="Describe cómo fue la sesión..." style={taStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={label11}>¿SEGUISTE TUS REGLAS?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {REGLAS_OPTS.map(({ label: lbl, color }) => (
                  <button key={lbl} onClick={() => updEdit('reglas', editForm.reglas === lbl ? '' : lbl)} style={{
                    padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: editForm.reglas === lbl ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    border: `1.5px solid ${editForm.reglas === lbl ? color : border}`,
                    color: editForm.reglas === lbl ? '#0A0A0C' : text, transition: 'all 0.15s',
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={label11}>NOTAS</div>
              <textarea value={editForm.notas} onChange={(ev) => updEdit('notas', ev.target.value)} placeholder="Notas adicionales sobre la sesión..." style={taStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={label11}>APRENDIZAJE DEL DÍA</div>
              <textarea value={editForm.aprendizaje} onChange={(ev) => updEdit('aprendizaje', ev.target.value)} placeholder="¿Qué llevarás a mañana?" style={taStyle} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={handleUpdate} disabled={saving || !editForm.titulo.trim()} style={{
                height: 38, padding: '0 20px',
                background: saving || !editForm.titulo.trim() ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : ACCENT,
                border: 'none', borderRadius: 9,
                color: saving || !editForm.titulo.trim() ? muted : '#0A0A0C',
                fontWeight: 700, fontSize: 13, cursor: saving || !editForm.titulo.trim() ? 'default' : 'pointer',
              }}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setEditingId(null)} style={{
                height: 38, padding: '0 20px', background: 'transparent',
                border: `1px solid ${border}`, borderRadius: 9, color: muted, fontSize: 13, cursor: 'pointer',
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isOpen && editingId !== e.id && (
          <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${border}` }}>
            {hasPrice && (
              <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                {([['ENTRADA', e.entry], ['SALIDA', e.exit], ['STOP', e.stop]] as const).map(([lbl, val]) =>
                  (val as number) !== 0 ? (
                    <div key={lbl}>
                      <div style={{ fontSize: 10, color: muted, letterSpacing: '0.08em', marginBottom: 3 }}>{lbl}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{val}</div>
                    </div>
                  ) : null
                )}
              </div>
            )}
            {[
              ['¿QUÉ PASÓ?', ref.quePaso],
              ['¿SEGUISTE TUS REGLAS?', ref.reglas],
              ['NOTAS', ref.notas],
              ['APRENDIZAJE', ref.aprendizaje],
            ].map(([lbl, val]) => val ? (
              <div key={lbl} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.08em', marginBottom: 5 }}>{lbl}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: text, opacity: 0.8, whiteSpace: 'pre-wrap' }}>{val}</div>
              </div>
            ) : null)}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={(ev) => { ev.stopPropagation(); startEdit(e) }}
                style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, color: text, fontSize: 12, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Editar
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
                style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, color: muted, fontSize: 12, padding: '5px 12px', cursor: 'pointer', opacity: 0.7 }}
              >
                Eliminar entrada
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── new entry form ────────────────────────────────────────────────────────

  function renderEntryForm() {
    return (
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${border}`, fontSize: 13, color: muted }}>
          {new Date(form.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ padding: 24 }}>

          <div style={{ marginBottom: 20 }}>
            <div style={label11}>FECHA DE LA SESIÓN</div>
            <input type="date" value={form.date} onChange={(e) => upd('date', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={label11}>ESTADO DE ÁNIMO</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {MOODS.map((m) => (
                <button key={m} onClick={() => upd('mood', m)} style={{
                  fontSize: 24,
                  background: form.mood === m ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
                  border: `2px solid ${form.mood === m ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') : 'transparent'}`,
                  borderRadius: 10, padding: '5px 9px', cursor: 'pointer',
                }}>{m}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={label11}>TÍTULO / RESUMEN</div>
              <input value={form.titulo} onChange={(e) => upd('titulo', e.target.value)} placeholder="ej. Buen día, seguí el plan" style={inputStyle} />
            </div>
            <div>
              <div style={label11}>P&amp;L</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={form.pnlText} onChange={(e) => upd('pnlText', e.target.value)} placeholder="+$320" style={{ ...inputStyle, width: 90 }} />
                <button
                  onClick={() => { const v = calcPnl(form.instrument, form.entrada, form.salida); if (v) upd('pnlText', v) }}
                  title="Calcular desde entrada/salida"
                  style={{ height: 34, padding: '0 8px', background: surf2, border: `1px solid ${border}`, borderRadius: 7, color: muted, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >Calc</button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={label11}>SESGO DE LA SESIÓN</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SESGOS.map(({ label: lbl, value, color }) => (
                <button key={value} onClick={() => upd('sesgo', form.sesgo === value ? '' : value)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: form.sesgo === value ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  color: form.sesgo === value ? '#0A0A0C' : muted,
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 90 }}>
              <div style={label11}>INSTRUMENTO</div>
              <select value={form.instrument} onChange={(e) => upd('instrument', e.target.value)} style={{ ...inputStyle, width: 'auto', paddingRight: 8 }}>
                {INSTRUMENTS.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={label11}>ENTRADA</div>
              <input type="number" value={form.entrada} onChange={(e) => upd('entrada', e.target.value)} placeholder="5280.00" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={label11}>SALIDA</div>
              <input type="number" value={form.salida} onChange={(e) => upd('salida', e.target.value)} placeholder="5290.00" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={label11}>STOP</div>
              <input type="number" value={form.stop} onChange={(e) => upd('stop', e.target.value)} placeholder="5275.00" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={label11}>¿QUÉ PASÓ?</div>
            <textarea value={form.quePaso} onChange={(e) => upd('quePaso', e.target.value)} placeholder="Describe cómo fue la sesión..." style={taStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={label11}>¿SEGUISTE TUS REGLAS?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {REGLAS_OPTS.map(({ label: lbl, color }) => (
                <button key={lbl} onClick={() => upd('reglas', form.reglas === lbl ? '' : lbl)} style={{
                  padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: form.reglas === lbl ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  border: `1.5px solid ${form.reglas === lbl ? color : border}`,
                  color: form.reglas === lbl ? '#0A0A0C' : text, transition: 'all 0.15s',
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={label11}>NOTAS</div>
            <textarea value={form.notas} onChange={(e) => upd('notas', e.target.value)} placeholder="Notas adicionales sobre la sesión..." style={taStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={label11}>APRENDIZAJE DEL DÍA</div>
            <textarea value={form.aprendizaje} onChange={(e) => upd('aprendizaje', e.target.value)} placeholder="¿Qué llevarás a mañana?" style={taStyle} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving || !form.titulo.trim()} style={{
              height: 38, padding: '0 20px',
              background: saving || !form.titulo.trim() ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : ACCENT,
              border: 'none', borderRadius: 9,
              color: saving || !form.titulo.trim() ? muted : '#0A0A0C',
              fontWeight: 700, fontSize: 13, cursor: saving || !form.titulo.trim() ? 'default' : 'pointer',
            }}>
              {saving ? 'Guardando...' : 'Guardar Entrada'}
            </button>
            <button onClick={() => setAdding(false)} style={{
              height: 38, padding: '0 20px', background: 'transparent',
              border: `1px solid ${border}`, borderRadius: 9, color: muted, fontSize: 13, cursor: 'pointer',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 40px', color: text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: muted, marginBottom: 4 }}>REGISTRO</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: text }}>Diario de Trading</h1>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entrada registrada' : 'entradas registradas'}
          </div>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setForm(emptyForm(todayDate())) }} style={{
            flexShrink: 0, height: 38, padding: '0 18px',
            background: text, border: 'none', borderRadius: 10,
            color: isDark ? '#0A0A0C' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            + Nueva Entrada
          </button>
        )}
      </div>

      {/* Account tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: `2px solid ${border}`,
      }}>
        {ACCOUNT_TABS.map((t) => (
          <button key={t} onClick={() => { setAccountTab(t); setSelectedDay(null); setOpenId(null) }} style={{
            padding: '9px 22px', background: 'transparent', border: 'none',
            borderBottom: accountTab === t ? `2px solid ${ACCENT}` : '2px solid transparent',
            marginBottom: -2,
            color: accountTab === t ? ACCENT : muted,
            fontWeight: accountTab === t ? 700 : 400,
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* New entry form */}
      {adding && renderEntryForm()}

      {/* Semanal/Historial tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content',
      }}>
        {([['semanal', 'Semanal'], ['historial', 'Historial']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '7px 20px', borderRadius: 7, fontSize: 13,
            fontWeight: tab === id ? 600 : 400, cursor: 'pointer', border: 'none',
            background: tab === id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
            color: tab === id ? text : muted,
            boxShadow: tab === id && !isDark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ══ SEMANAL TAB ══════════════════════════════════════════════════════ */}
      {tab === 'semanal' && (
        <div>
          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { setWeekOffset(o => o - 1); setSelectedDay(null) }} style={{
              background: surf2, border: `1px solid ${border}`, borderRadius: 8,
              color: text, cursor: 'pointer', fontSize: 18, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{weekLabel(weekDays)}</div>
              {!isCurrentWeek && (
                <button onClick={() => { setWeekOffset(0); setSelectedDay(null) }} style={{
                  background: 'transparent', border: 'none', color: ACCENT,
                  fontSize: 11, cursor: 'pointer', marginTop: 2, fontWeight: 600,
                }}>Semana actual</button>
              )}
            </div>

            <button
              onClick={() => { setWeekOffset(o => o + 1); setSelectedDay(null) }}
              disabled={isCurrentWeek}
              style={{
                background: surf2, border: `1px solid ${border}`, borderRadius: 8,
                color: isCurrentWeek ? muted : text, cursor: isCurrentWeek ? 'default' : 'pointer',
                fontSize: 18, width: 34, height: 34, opacity: isCurrentWeek ? 0.3 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>›</button>
          </div>

          {/* Weekly summary strip */}
          {weekSessions > 0 && (
            <div style={{
              display: 'flex', gap: 10, marginBottom: 16,
              background: surface, borderRadius: 12, border: `1px solid ${border}`,
              padding: '12px 20px', boxShadow: shadow,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 3 }}>P&L SEMANAL</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: pnlColor(weekPnl, muted) }}>{formatPnl(weekPnl)}</div>
              </div>
              <div style={{ width: 1, background: border }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 3 }}>SESIONES</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: text }}>{weekSessions}</div>
              </div>
              <div style={{ width: 1, background: border }} />
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 3 }}>WIN RATE</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: weekSessions > 0 ? pnlColor(weekWins / weekSessions - 0.5, muted) : muted }}>
                  {weekSessions > 0 ? `${Math.round((weekWins / weekSessions) * 100)}%` : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Day cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
            {weekDays.map((d) => {
              const ds = toDateStr(d)
              const dayE = entriesByDate[ds] ?? []
              const isToday = d.toDateString() === today.toDateString()
              const isFuture = d > today
              const isSelected = selectedDay === ds
              const dayPnl = dayE.reduce((s, e) => s + e.pnl, 0)
              const hasPnl = dayE.some(e => e.pnl !== 0)

              return (
                <button
                  key={ds}
                  onClick={() => !isFuture && setSelectedDay(isSelected ? null : ds)}
                  disabled={isFuture}
                  style={{
                    padding: '12px 10px', borderRadius: 12, border: 'none', cursor: isFuture ? 'default' : 'pointer',
                    background: isSelected ? `${ACCENT}20` : surface,
                    outline: isSelected ? `2px solid ${ACCENT}` : `1px solid ${isToday ? ACCENT + '60' : border}`,
                    textAlign: 'center', transition: 'all 0.15s',
                    opacity: isFuture ? 0.35 : 1,
                    boxShadow: shadow,
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: isToday ? ACCENT : muted, marginBottom: 4 }}>
                    {DAYS_ES[d.getDay()].toUpperCase()}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>{d.getDate()}</div>

                  {dayE.length > 0 ? (
                    <>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{dayE[0].emotions ?? '😐'}</div>
                      {hasPnl && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: pnlColor(dayPnl, muted) }}>
                          {formatPnl(dayPnl)}
                        </div>
                      )}
                      {dayE.length > 1 && (
                        <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>+{dayE.length - 1} más</div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>·</div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day entries */}
          {selectedDay && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: muted }}>
                  {DAYS_LONG[new Date(selectedDay + 'T12:00:00').getDay()].toUpperCase()} {new Date(selectedDay + 'T12:00:00').getDate()}
                </span>
                <div style={{ flex: 1, height: 1, background: border }} />
                <button
                  onClick={() => { setAdding(true); setForm(emptyForm(selectedDay)) }}
                  style={{ fontSize: 11, color: ACCENT, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Agregar entrada para este día
                </button>
              </div>
              {dayEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: muted, fontSize: 13 }}>
                  Sin entradas para este día
                </div>
              ) : (
                dayEntries.map(e => <div key={e.id}>{renderEntryCard(e)}</div>)
              )}
            </div>
          )}

          {/* Empty week */}
          {weekSessions === 0 && !selectedDay && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📒</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 4 }}>Sin entradas esta semana</div>
              <div style={{ fontSize: 13 }}>Selecciona un día para agregar tu primera entrada</div>
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORIAL TAB ════════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div>
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📒</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: text }}>Sin entradas aún</div>
              <div style={{ fontSize: 13 }}>Registra tu primera sesión después de operar</div>
            </div>
          ) : (
            (() => {
              // Group by week
              const byWeek: Record<string, Trade[]> = {}
              filteredEntries.forEach(e => {
                const d = new Date(e.date + 'T12:00:00')
                const dow = d.getDay()
                const mon = new Date(d)
                mon.setDate(d.getDate() - ((dow + 6) % 7))
                const wk = toDateStr(mon)
                if (!byWeek[wk]) byWeek[wk] = []
                byWeek[wk].push(e)
              })
              return Object.entries(byWeek)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([weekStart, wEntries]) => {
                  const wPnl = wEntries.reduce((s, e) => s + e.pnl, 0)
                  const fri = new Date(weekStart + 'T12:00:00')
                  fri.setDate(fri.getDate() + 4)
                  const rangeLabel = `${new Date(weekStart + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${fri.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                  return (
                    <div key={weekStart} style={{ marginBottom: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: muted }}>{rangeLabel}</span>
                        <div style={{ flex: 1, height: 1, background: border }} />
                        {wPnl !== 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: pnlColor(wPnl, muted) }}>{formatPnl(wPnl)}</span>
                        )}
                      </div>
                      {wEntries.map(e => <div key={e.id}>{renderEntryCard(e)}</div>)}
                    </div>
                  )
                })
            })()
          )}
        </div>
      )}
    </div>
  )
}
