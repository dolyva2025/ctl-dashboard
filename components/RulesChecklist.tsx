'use client'

import { useState, useEffect } from 'react'
import { getRuleChecks, setRuleCheck } from '@/lib/api'

const FIXED_RULES: { key: string; category: string; rule: string }[] = [
  { key: 'stop_loss',      category: 'Gestión de Riesgo', rule: 'Siempre usar Stop Loss — sin excepción, en cada operación.' },
  { key: 'risk_2pct',      category: 'Gestión de Riesgo', rule: 'El riesgo por trade no superó el 2% de la cuenta.' },
  { key: 'position_size',  category: 'Gestión de Riesgo', rule: 'El position sizing fue consistente en cada operación.' },
  { key: 'two_loss_rule',  category: 'Gestión de Riesgo', rule: 'Cerré la sesión después de dos trades negativos.' },
  { key: 'clear_plan',     category: 'Entrada',           rule: 'Solo entré si tenía un plan claro — pude explicar por qué estaba en el trade.' },
  { key: 'no_revenge',     category: 'Psicología',        rule: 'No hice revenge trading — si sentí esa emoción, me retiré.' },
  { key: 'patience',       category: 'Psicología',        rule: 'Cultivé la paciencia — no forzé trades.' },
]

const CATEGORIES = ['Gestión de Riesgo', 'Entrada', 'Psicología']

type Props = { userId: string; date: string }

export function RulesChecklist({ userId, date }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRuleChecks(userId, date).then((data) => { setChecks(data); setLoading(false) })
  }, [userId, date])

  async function toggle(key: string) {
    const newVal = !checks[key]
    setChecks((prev) => ({ ...prev, [key]: newVal }))
    await setRuleCheck(userId, date, key, newVal)
  }

  const checked = Object.values(checks).filter(Boolean).length
  const total = FIXED_RULES.length
  const allDone = checked === total

  if (loading) return <p className="text-sm text-zinc-400 py-4 text-center">Cargando...</p>

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{checked} / {total} reglas seguidas</p>
        {allDone && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 text-white">
            ✓ Sesión completada
          </span>
        )}
      </div>

      <div className="w-full bg-zinc-100 rounded-full h-1.5">
        <div
          className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(checked / total) * 100}%` }}
        />
      </div>

      {/* Rules by category */}
      {CATEGORIES.map((cat) => {
        const items = FIXED_RULES.filter((r) => r.category === cat)
        return (
          <div key={cat}>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-3">{cat}</p>
            <div className="space-y-2">
              {items.map((r) => {
                const isChecked = !!checks[r.key]
                return (
                  <button
                    key={r.key}
                    onClick={() => toggle(r.key)}
                    className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                      isChecked
                        ? 'border-zinc-900 bg-zinc-900'
                        : 'border-zinc-200 bg-card hover:border-zinc-400'
                    }`}
                  >
                    <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-white border-white' : 'border-zinc-300'
                    }`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </span>
                    <p className={`text-sm leading-relaxed ${isChecked ? 'text-white' : 'text-zinc-700'}`}>
                      {r.rule}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
