'use client'

import { useState, useEffect } from 'react'
import type { DailyRoutine } from '@/lib/storage'
import * as api from '@/lib/api'
import { scoreRoutine } from '@/lib/scoring'
import { useTheme } from '@/lib/themeContext'

type Question = {
  icon: string
  category: string
  text: string
  type: 'yesno' | 'options'
  options?: string[]
}

const QUESTIONS: Question[] = [
  { icon: '📓', category: 'DISCIPLINA',    text: '¿Hicimos journaling de la sesión del día de ayer?',                          type: 'yesno' },
  { icon: '📊', category: 'REVISIÓN',      text: '¿Cuál fue el resultado de la sesión del día de ayer?',                       type: 'options', options: ['Positivo', 'Neutral', 'Negativo'] },
  { icon: '😴', category: 'ESTADO FÍSICO', text: '¿Cómo dormimos anoche?',                                                     type: 'options', options: ['Bien', 'Regular', 'Mal'] },
  { icon: '🏃', category: 'ESTADO FÍSICO', text: '¿Ejercitamos esta mañana?',                                                  type: 'yesno' },
  { icon: '🧘', category: 'ESTADO MENTAL', text: '¿Hicimos meditación o alguna práctica para relajar la mente?',              type: 'yesno' },
  { icon: '📈', category: 'PREPARACIÓN',   text: '¿Hicimos Market Prep esta mañana?',                                          type: 'yesno' },
  { icon: '🎯', category: 'PREPARACIÓN',   text: '¿Tenemos una visión clara y niveles de entrada y salida para hoy?',         type: 'yesno' },
  { icon: '📉', category: 'MERCADO',       text: '¿Cómo describes la estructura técnica actual del mercado?',                 type: 'options', options: ['Trending Up', 'Trending Down', 'Consolidación', 'Distribución', 'Acumulación', 'Sin claridad'] },
  { icon: '📅', category: 'PREPARACIÓN',   text: '¿Revisaste el calendario económico y estás al tanto de los eventos de hoy?', type: 'yesno' },
]

const TOTAL = QUESTIONS.length

// Color per answer value
const OPTION_COLORS: Record<string, string> = {
  'Sí':           'oklch(72% 0.18 155)',
  'No':           'oklch(65% 0.18 25)',
  'Positivo':     'oklch(72% 0.18 155)',
  'Negativo':     'oklch(65% 0.18 25)',
  'Neutral':      'oklch(78% 0.17 88)',
  'Bien':         'oklch(72% 0.18 155)',
  'Regular':      'oklch(78% 0.17 88)',
  'Mal':          'oklch(65% 0.18 25)',
  'Trending Up':  'oklch(72% 0.18 155)',
  'Trending Down':'oklch(65% 0.18 25)',
  'Consolidación':'oklch(78% 0.17 88)',
  'Distribución': 'oklch(68% 0.19 42)',
  'Acumulación':  'oklch(70% 0.17 240)',
  'Sin claridad': 'oklch(55% 0.05 240)',
}

const ACCENT = 'oklch(68% 0.19 42)'

// Map stored value → display label
function storedToDisplay(val: string | null, type: Question['type']): string | null {
  if (val === null) return null
  if (type === 'yesno') return val === 'yes' ? 'Sí' : 'No'
  return val
}

// Map display label → stored value
function displayToStored(label: string, type: Question['type']): string {
  if (type === 'yesno') return label === 'Sí' ? 'yes' : 'no'
  return label
}

// Recommendation UI config
const REC_CONFIG = {
  trade:      { color: 'oklch(72% 0.18 155)', label: 'OPERA HOY',             sub: 'Las condiciones son favorables. Ejecuta tu plan.' },
  caution:    { color: 'oklch(78% 0.17 88)',  label: 'OPERA CON CAUTELA',      sub: 'Algunas condiciones no son ideales. Reduce el tamaño de posición.' },
  'sit-out':  { color: 'oklch(65% 0.18 25)',  label: 'CONSIDERA NO OPERAR',    sub: 'Las condiciones no son favorables hoy. Protege tu capital.' },
  incomplete: { color: 'oklch(55% 0.05 240)', label: 'Análisis incompleto',    sub: 'Responde todas las preguntas para obtener tu recomendación.' },
}

type Props = { userId: string; date: string }

export function Checklist({ userId, date }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'navy'

  const [routine, setRoutine] = useState<DailyRoutine>({
    date, answers: Array(TOTAL).fill(null), notes: Array(TOTAL).fill(''), completed: false,
  })
  const [step, setStep] = useState(0)

  useEffect(() => {
    api.getRoutine(userId, date).then((r) => {
      setRoutine(r)
      // Start at first unanswered, or last if all done
      const firstUnanswered = r.answers.findIndex((a) => a === null)
      setStep(firstUnanswered === -1 ? TOTAL : firstUnanswered)
    })
  }, [userId, date])

  function selectAnswer(index: number, displayValue: string) {
    const storedValue = displayToStored(displayValue, QUESTIONS[index].type)
    const newAnswers = [...routine.answers]
    newAnswers[index] = storedValue
    const answered = newAnswers.filter((a) => a !== null).length
    const updated: DailyRoutine = {
      ...routine,
      answers: newAnswers,
      completed: answered === TOTAL,
    }
    setRoutine(updated)
    api.saveRoutine(userId, updated)
    // Auto-advance
    if (index < TOTAL - 1) {
      setTimeout(() => setStep(index + 1), 180)
    } else {
      setTimeout(() => setStep(TOTAL), 180)
    }
  }

  function reset() {
    const fresh: DailyRoutine = { date, answers: Array(TOTAL).fill(null), notes: Array(TOTAL).fill(''), completed: false }
    setRoutine(fresh)
    setStep(0)
    api.saveRoutine(userId, fresh)
  }

  const result = scoreRoutine(routine)
  const answered = routine.answers.filter((a) => a !== null).length
  const allDone = answered === TOTAL
  const showResults = step === TOTAL && allDone

  // Theme
  const surface  = isDark ? 'hsl(226 48% 11%)' : '#ffffff'
  const border   = isDark ? 'hsl(228 30% 17%)' : '#e4e4e7'
  const text     = isDark ? 'hsl(228 100% 95%)' : '#09090b'
  const muted    = isDark ? 'hsl(228 30% 55%)' : '#71717a'
  const surf2    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const shadow   = isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'

  const card: React.CSSProperties = {
    background: surface, borderRadius: 14,
    border: `1px solid ${border}`, boxShadow: shadow, overflow: 'hidden',
  }

  const q = QUESTIONS[step]

  return (
    <div style={{ color: text }}>

      {/* Progress bar + step dots */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: muted }}>{answered} / {TOTAL} respondidas</span>
          {allDone && <span style={{ fontSize: 11, color: 'oklch(72% 0.18 155)', fontWeight: 600 }}>✓ Completo</span>}
        </div>
        {/* Bar */}
        <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${(answered / TOTAL) * 100}%`, background: ACCENT, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {QUESTIONS.map((_, i) => {
            const ans = routine.answers[i]
            const isCur = i === step && !showResults
            return (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  height: 6, flex: 1, borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s',
                  background: ans !== null
                    ? ACCENT
                    : isCur
                    ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)')
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                }}
              />
            )
          })}
        </div>
      </div>

      {/* ── Wizard step ────────────────────────────────────────────────────── */}
      {!showResults ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px' }}>
          <div style={{ maxWidth: 560, width: '100%' }}>

            {/* Category + number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>{q.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: muted }}>{q.category}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: muted, fontWeight: 500 }}>{step + 1} de {TOTAL}</span>
            </div>

            {/* Question */}
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.01em', marginBottom: 32, fontFamily: 'var(--font-heading, inherit)', color: text }}>
              {q.text}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {(q.type === 'yesno' ? ['Sí', 'No'] : q.options!).map((opt) => {
                const storedVal = displayToStored(opt, q.type)
                const isSelected = routine.answers[step] === storedVal
                const optColor = OPTION_COLORS[opt] || ACCENT
                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(step, opt)}
                    style={{
                      padding: '11px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? optColor : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      border: `1.5px solid ${isSelected ? optColor : border}`,
                      color: isSelected ? '#0A0A0C' : text,
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                style={{
                  padding: '9px 20px', background: 'transparent',
                  border: `1px solid ${border}`, borderRadius: 9,
                  color: step === 0 ? muted : text,
                  cursor: step === 0 ? 'default' : 'pointer',
                  fontSize: 13, opacity: step === 0 ? 0.4 : 1,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setStep(step < TOTAL - 1 ? step + 1 : TOTAL)}
                style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: routine.answers[step] !== null ? ACCENT : 'transparent',
                  border: `1px solid ${routine.answers[step] !== null ? ACCENT : border}`,
                  color: routine.answers[step] !== null ? '#0A0A0C' : muted,
                }}
              >
                {step === TOTAL - 1 ? 'Ver resultado →' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Results view ──────────────────────────────────────────────────── */
        <div>
          {/* Status banner */}
          {(() => {
            const cfg = REC_CONFIG[result.recommendation]
            return (
              <div style={{
                background: `${cfg.color}18`,
                border: `1px solid ${cfg.color}40`,
                borderRadius: 14, padding: '16px 22px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: '0.04em', marginBottom: 2 }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 13, color: muted }}>{cfg.sub}</div>
                </div>
                {result.recommendation !== 'incomplete' && (
                  <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>
                    {result.score}/{result.total}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Summary list */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, fontSize: 11, color: muted, fontWeight: 700, letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
              <span>ANÁLISIS PRE-SESIÓN</span>
              <span>{answered} / {TOTAL} respondidas</span>
            </div>
            {QUESTIONS.map((q, i) => {
              const storedAns = routine.answers[i]
              const displayAns = storedToDisplay(storedAns, q.type)
              const optColor = displayAns ? (OPTION_COLORS[displayAns] || muted) : muted
              return (
                <div
                  key={i}
                  onClick={() => { setStep(i) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 20px',
                    borderBottom: i < TOTAL - 1 ? `1px solid ${border}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{q.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: muted, letterSpacing: '0.07em', marginBottom: 2 }}>{q.category}</div>
                    <div style={{ fontSize: 13, color: text }}>{q.text}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: optColor }}>{displayAns ?? '—'}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: optColor }} />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={reset}
            style={{
              padding: '9px 20px', background: 'transparent',
              border: `1px solid ${border}`, borderRadius: 9,
              color: muted, fontSize: 13, cursor: 'pointer',
            }}
          >
            ↺ Rehacer análisis
          </button>
        </div>
      )}
    </div>
  )
}
