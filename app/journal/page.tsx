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

function parsePnl(text: string): number {
  const sign = text.trim().startsWith('-') ? -1 : 1
  const num = parseFloat(text.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? 0 : Math.abs(num) * sign
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

interface EntryForm {
  date: string
  mood: string
  titulo: string
  pnlText: string
  sesgo: string
  quePaso: string
  reglas: string
  aprendizaje: string
}

function emptyForm(date: string): EntryForm {
  return { date, mood: '😐', titulo: '', pnlText: '', sesgo: '', quePaso: '', reglas: '', aprendizaje: '' }
}

// Pack reflective fields into trade.reflection as JSON
function packReflection(form: EntryForm): string {
  return JSON.stringify({ quePaso: form.quePaso, reglas: form.reglas, aprendizaje: form.aprendizaje })
}

function unpackReflection(r: string | undefined): { quePaso: string; reglas: string; aprendizaje: string } {
  try { if (r) return JSON.parse(r) } catch {}
  return { quePaso: r ?? '', reglas: '', aprendizaje: '' }
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'

  const [entries, setEntries] = useState<Trade[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<EntryForm>(emptyForm(todayDate()))
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

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
  const surf2   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
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

  function upd(key: keyof EntryForm, val: string) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      const newTrade = await api.addTrade(userId, {
        date:          form.date,
        instrument:    'ES',
        direction:     'Long',
        entry:         0,
        stop:          0,
        target:        0,
        exit:          0,
        pnl:           parsePnl(form.pnlText),
        account_type:  'Personal',
        emotions:      form.mood,
        notes:         form.titulo,
        rule_adherence: form.sesgo || undefined,
        reflection:    packReflection(form),
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

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 40px', color: text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: muted, marginBottom: 4 }}>REGISTRO</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: text }}>
            Diario de Trading
          </h1>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
            {entries.length} {entries.length === 1 ? 'entrada registrada' : 'entradas registradas'}
          </div>
        </div>

        {!adding && (
          <button
            onClick={() => { setAdding(true); setForm(emptyForm(todayDate())) }}
            style={{
              flexShrink: 0, height: 38, padding: '0 18px',
              background: text, border: 'none', borderRadius: 10,
              color: isDark ? '#0A0A0C' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            + Nueva Entrada
          </button>
        )}
      </div>

      {/* ── New entry form ─────────────────────────────────────────────────── */}
      {adding && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${border}`, fontSize: 13, color: muted }}>
            {new Date(form.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ padding: 24 }}>

            {/* Date selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 6 }}>FECHA DE LA SESIÓN</div>
              <input
                type="date"
                value={form.date}
                onChange={(e) => upd('date', e.target.value)}
                style={{ ...inputStyle, width: 'auto' }}
              />
            </div>

            {/* Mood */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 8 }}>ESTADO DE ÁNIMO</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => upd('mood', m)}
                    style={{
                      fontSize: 24, background: form.mood === m ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
                      border: `2px solid ${form.mood === m ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') : 'transparent'}`,
                      borderRadius: 10, padding: '5px 9px', cursor: 'pointer',
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>

            {/* Título + P&L */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 6 }}>TÍTULO / RESUMEN</div>
                <input value={form.titulo} onChange={(e) => upd('titulo', e.target.value)} placeholder="ej. Buen día, seguí el plan" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 6 }}>P&amp;L</div>
                <input value={form.pnlText} onChange={(e) => upd('pnlText', e.target.value)} placeholder="+$320" style={{ ...inputStyle, width: 100 }} />
              </div>
            </div>

            {/* Sesgo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 8 }}>SESGO DE LA SESIÓN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SESGOS.map(({ label, value, color }) => (
                  <button
                    key={value}
                    onClick={() => upd('sesgo', form.sesgo === value ? '' : value)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: form.sesgo === value ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      color: form.sesgo === value ? '#0A0A0C' : muted,
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Reflection fields */}
            {[
              ['¿QUÉ PASÓ?', 'quePaso', 'Describe cómo fue la sesión...'],
              ['¿SEGUISTE TUS REGLAS?', 'reglas', 'Sí / No / Parcialmente... explica'],
              ['APRENDIZAJE DEL DÍA', 'aprendizaje', '¿Qué llevarás a mañana?'],
            ].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                <textarea
                  value={form[key as keyof EntryForm]}
                  onChange={(e) => upd(key as keyof EntryForm, e.target.value)}
                  placeholder={ph}
                  style={taStyle}
                />
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo.trim()}
                style={{
                  height: 38, padding: '0 20px',
                  background: saving || !form.titulo.trim() ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : ACCENT,
                  border: 'none', borderRadius: 9,
                  color: saving || !form.titulo.trim() ? muted : '#0A0A0C',
                  fontWeight: 700, fontSize: 13, cursor: saving || !form.titulo.trim() ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar Entrada'}
              </button>
              <button
                onClick={() => setAdding(false)}
                style={{
                  height: 38, padding: '0 20px', background: 'transparent',
                  border: `1px solid ${border}`, borderRadius: 9,
                  color: muted, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {entries.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: text }}>Sin entradas aún</div>
          <div style={{ fontSize: 13 }}>Registra tu primera sesión después de operar</div>
        </div>
      )}

      {/* ── Entry list ─────────────────────────────────────────────────────── */}
      {entries.map((e) => {
        const isOpen = openId === e.id
        const ref = unpackReflection(e.reflection)
        const dateLabel = new Date(e.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        const hasPnl = e.pnl !== 0
        const pColor = pnlColor(e.pnl, muted)

        return (
          <div key={e.id} style={card}>
            {/* Card header (always visible) */}
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
                  {e.rule_adherence && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      padding: '2px 6px', borderRadius: 5,
                      background: sesgoBadgeColor(e.rule_adherence) + '22',
                      color: sesgoBadgeColor(e.rule_adherence),
                    }}>
                      {e.rule_adherence.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              {hasPnl && (
                <div style={{ fontSize: 16, fontWeight: 800, color: pColor, flexShrink: 0 }}>
                  {formatPnl(e.pnl)}
                </div>
              )}
              <div style={{ color: muted, fontSize: 11, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${border}` }}>
                {[
                  ['¿QUÉ PASÓ?', ref.quePaso],
                  ['¿SEGUISTE TUS REGLAS?', ref.reglas],
                  ['APRENDIZAJE', ref.aprendizaje],
                ].map(([label, val]) => val ? (
                  <div key={label} style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, color: muted, letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: text, opacity: 0.8, whiteSpace: 'pre-wrap' }}>{val}</div>
                  </div>
                ) : null)}

                <button
                  onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
                  style={{
                    marginTop: 20, background: 'transparent',
                    border: `1px solid ${border}`, borderRadius: 8,
                    color: muted, fontSize: 12, padding: '5px 12px', cursor: 'pointer',
                    opacity: 0.7,
                  }}
                >
                  Eliminar entrada
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
