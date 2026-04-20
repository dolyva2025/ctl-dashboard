'use client'

import { useState, useEffect } from 'react'
import type { DailyRoutine } from '@/lib/storage'
import * as api from '@/lib/api'
import { scoreRoutine } from '@/lib/scoring'
import type { ScoringResult } from '@/lib/scoring'
import {
  BookOpen, TrendingUp, Moon,
  Zap, Brain, BarChart2, Target, Activity, Calendar,
} from 'lucide-react'

type Question = {
  icon: React.ElementType
  category: string
  text: string
  type: 'yesno' | 'options'
  options?: string[]
}

const QUESTIONS: Question[] = [
  { icon: BookOpen,   category: 'Disciplina',    text: '¿Hicimos journaling de la sesión del día de ayer?',                         type: 'yesno' },
  { icon: TrendingUp, category: 'Revisión',       text: '¿Cuál fue el resultado de la sesión del día de ayer?',                      type: 'options', options: ['Positivo', 'Neutral', 'Negativo'] },
  { icon: Moon,       category: 'Estado físico',  text: '¿Cómo dormimos anoche?',                                                    type: 'options', options: ['Bien', 'Regular', 'Mal'] },
  { icon: Zap,        category: 'Estado físico',  text: '¿Ejercitamos esta mañana?',                                                 type: 'yesno' },
  { icon: Brain,      category: 'Estado mental',  text: '¿Hicimos meditación o alguna práctica para relajar la mente?',             type: 'yesno' },
  { icon: BarChart2,  category: 'Preparación',    text: '¿Hicimos Market Prep esta mañana?',                                         type: 'yesno' },
  { icon: Target,     category: 'Preparación',    text: '¿Tenemos una visión clara y niveles claros de entrada y salida para hoy?',  type: 'yesno' },
  { icon: Activity,   category: 'Mercado',        text: '¿Cómo describes la estructura técnica actual del mercado?',               type: 'options', options: ['Trending Up', 'Trending Down', 'Consolidación', 'Distribución', 'Acumulación', 'Sin claridad'] },
  { icon: Calendar,   category: 'Preparación',    text: '¿Revisaste el calendario económico y estás al tanto de los eventos de hoy?', type: 'yesno' },
]

const TOTAL = QUESTIONS.length

const REC_STYLES: Record<string, { outer: string; dot: string; label: string; sub: string; score: string }> = {
  trade:      { outer: 'bg-zinc-900  border-2 border-zinc-900',   dot: 'bg-green-500',  label: 'text-white',      sub: 'text-zinc-300',   score: 'text-zinc-300'  },
  caution:    { outer: 'bg-zinc-100  border-2 border-zinc-400',   dot: 'bg-orange-500', label: 'text-zinc-800',   sub: 'text-zinc-600',   score: 'text-zinc-600'  },
  'sit-out':  { outer: 'bg-white     border-2 border-zinc-900',   dot: 'bg-red-500',    label: 'text-zinc-900',   sub: 'text-zinc-600',   score: 'text-zinc-600'  },
  incomplete: { outer: 'bg-zinc-50   border-2 border-zinc-200',   dot: 'bg-zinc-400',   label: 'text-zinc-700',   sub: 'text-zinc-500',   score: 'text-zinc-400'  },
}

const REC_LABELS: Record<string, string> = {
  trade:      'OPERA HOY — Las condiciones son favorables',
  caution:    'OPERA CON CAUTELA — Revisa tu ventaja',
  'sit-out':  'NO OPERES HOY — Protege tu capital',
  incomplete: 'Completa el cuestionario para ver tu recomendación',
}

const REC_DESC: Record<string, string> = {
  trade:      'Estás listo. Ejecuta tu plan y respeta tu gestión de riesgo.',
  caution:    'Reduce tamaño o sé muy selectivo con los setups.',
  'sit-out':  'Las condiciones no son favorables. No operar también es una decisión.',
  incomplete: '',
}

function Banner({ result }: { result: ScoringResult }) {
  const s = REC_STYLES[result.recommendation]
  return (
    <div className={`${s.outer} rounded-2xl px-6 py-5`}>
      <div className="flex items-center gap-3 mb-1">
        <span className={`h-3 w-3 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className={`font-bold text-base ${s.label}`}>{REC_LABELS[result.recommendation]}</span>
        {result.recommendation !== 'incomplete' && (
          <span className={`ml-auto text-sm font-semibold ${s.score}`}>{result.score}/{result.total}</span>
        )}
      </div>
      {REC_DESC[result.recommendation] && (
        <p className={`ml-6 text-sm ${s.sub}`}>{REC_DESC[result.recommendation]}</p>
      )}
    </div>
  )
}

type Props = { userId: string; date: string }

export function Checklist({ userId, date }: Props) {
  const [routine, setRoutine] = useState<DailyRoutine>({ date, answers: Array(9).fill(null), notes: Array(9).fill(''), completed: false })
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.getRoutine(userId, date).then(setRoutine)
  }, [userId, date])

  function selectAnswer(index: number, value: string) {
    if (routine.completed) return
    const newAnswers = [...routine.answers]
    newAnswers[index] = value
    const updated: DailyRoutine = { ...routine, answers: newAnswers, completed: false }
    setRoutine(updated)
    api.saveRoutine(userId, updated)
  }

  async function confirm() {
    setConfirming(true)
    const updated: DailyRoutine = { ...routine, completed: true }
    setRoutine(updated)
    await api.saveRoutine(userId, updated)
    setConfirming(false)
  }

  function reset() {
    const fresh: DailyRoutine = {
      date,
      answers: Array(9).fill(null),
      notes: Array(9).fill(''),
      completed: false,
    }
    setRoutine(fresh)
    api.saveRoutine(userId, fresh)
  }

  const result = scoreRoutine(routine)
  const answered = routine.answers.filter((a) => a !== null).length
  const allAnswered = answered === TOTAL

  return (
    <div className="space-y-4">
      {routine.completed && <Banner result={result} />}

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          Análisis Pre-Sesión
        </span>
        <span className="text-sm text-muted-foreground">{answered} / {TOTAL} respondidas</span>
      </div>

      {QUESTIONS.map((q, i) => {
        const Icon = q.icon
        const ans = routine.answers[i]
        const isDone = ans !== null

        return (
          <div
            key={i}
            className={`group relative rounded-lg border bg-card p-6 transition-all duration-300 ${
              isDone
                ? 'border-primary/40 shadow-sm'
                : routine.completed ? '' : 'hover:border-primary/60 hover:shadow-lg cursor-pointer'
            }`}
          >
            {/* Decorative left line */}
            <div className={`absolute -left-[1px] top-1/2 h-1/2 w-px -translate-y-1/2 transition-colors ${
              isDone ? 'bg-primary/40' : 'bg-border group-hover:bg-primary/60'
            }`} />

            <div className="flex items-start gap-5">
              {/* Icon */}
              <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm transition-colors duration-300 ${
                isDone
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-primary group-hover:bg-primary group-hover:text-primary-foreground'
              }`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
                  {q.category}
                </p>
                <p className="text-base font-semibold text-card-foreground leading-snug mb-4">
                  {q.text}
                </p>

                {q.type === 'yesno' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => selectAnswer(i, 'yes')}
                      disabled={routine.completed}
                      className={`px-6 py-2 rounded-full font-semibold text-sm transition-all duration-150 disabled:cursor-not-allowed ${
                        ans === 'yes'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-input text-muted-foreground hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => selectAnswer(i, 'no')}
                      disabled={routine.completed}
                      className={`px-6 py-2 rounded-full font-semibold text-sm transition-all duration-150 disabled:cursor-not-allowed ${
                        ans === 'no'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'border border-input text-muted-foreground hover:border-slate-400 hover:text-slate-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {q.options!.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => selectAnswer(i, opt)}
                        disabled={routine.completed}
                        className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-150 disabled:cursor-not-allowed ${
                          ans === opt
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-input text-muted-foreground hover:border-primary/50 hover:text-primary'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {!routine.completed && allAnswered && (
        <button
          onClick={confirm}
          disabled={confirming}
          className="w-full bg-zinc-900 hover:bg-black disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {confirming ? 'Confirmando...' : 'Confirmar rutina del día →'}
        </button>
      )}

      {answered > 0 && !routine.completed && (
        <button
          onClick={reset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ↺ Borrar respuestas
        </button>
      )}

      {routine.completed && (
        <button
          onClick={reset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ↺ Reiniciar rutina
        </button>
      )}
    </div>
  )
}
