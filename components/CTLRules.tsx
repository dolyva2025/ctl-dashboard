'use client'

import { useState, useEffect } from 'react'
import { getCTLRules, addCTLRule, deleteCTLRule, type Rule } from '@/lib/api'
import { isAdmin } from '@/lib/config'

const CATEGORIES = ['Entrada', 'Salida', 'Gestión de Riesgo', 'Psicología']
const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"

const FIXED_RULES: { category: string; rule: string }[] = [
  { category: 'Gestión de Riesgo', rule: 'Siempre usar Stop Loss — sin excepción, en cada operación.' },
  { category: 'Gestión de Riesgo', rule: 'El riesgo por trade no debe superar el 2% de la cuenta.' },
  { category: 'Gestión de Riesgo', rule: 'El position sizing debe ser consistente en cada operación.' },
  { category: 'Gestión de Riesgo', rule: 'Después de dos trades negativos en el día, cerrar la sesión.' },
  { category: 'Entrada',           rule: 'Solo entrar si tienes un plan claro — si no puedes explicar por qué estás en el trade, el trade no es válido.' },
  { category: 'Psicología',        rule: 'No hacer revenge trading — si identificas esa emoción, retírate por el día.' },
  { category: 'Psicología',        rule: 'Cultivar la paciencia — el mejor trade a veces es no operar.' },
]

type Props = { userEmail: string }

export function CTLRules({ userEmail }: Props) {
  const isAdminUser = isAdmin(userEmail)
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [rule, setRule] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCTLRules().then((data) => { setRules(data); setLoading(false) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!rule.trim()) return
    setSaving(true)
    const newRule = await addCTLRule(category, rule.trim())
    setRules((prev) => [...prev, newRule])
    setRule('')
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteCTLRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const grouped = CATEGORIES.reduce<Record<string, Rule[]>>((acc, cat) => {
    acc[cat] = rules.filter((r) => r.category === cat)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-sm">Reglas Collective Trade Lab</p>
          <p className="text-xs text-zinc-500">Reglas publicadas para el canal</p>
        </div>
      </div>

      {isAdminUser && (
        <form onSubmit={handleAdd} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Categoría</p>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Regla</p>
              <div className="flex gap-2">
                <input value={rule} onChange={(e) => setRule(e.target.value)}
                  placeholder="Escribe la regla..."
                  className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
                <button type="submit" disabled={saving}
                  className="bg-zinc-900 hover:bg-black disabled:opacity-60 text-white text-sm font-semibold px-4 rounded-lg transition-colors">
                  {saving ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 py-4 text-center">Cargando...</p>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((cat) => {
            const fixed = FIXED_RULES.filter((r) => r.category === cat)
            const dynamic = grouped[cat] ?? []
            if (fixed.length === 0 && dynamic.length === 0) return null
            return (
              <div key={cat}>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">{cat}</p>
                <div className="space-y-2">
                  {fixed.map((r, i) => (
                    <div key={`fixed-${i}`} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
                      <span className="text-zinc-300 mt-0.5 flex-shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </span>
                      <p className="text-sm text-zinc-700 leading-relaxed">{r.rule}</p>
                    </div>
                  ))}
                  {dynamic.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-dashed bg-card px-4 py-3">
                      <p className="text-sm text-zinc-700 leading-relaxed">{r.rule}</p>
                      {isAdminUser && (
                        <button onClick={() => handleDelete(r.id)} className="text-zinc-300 hover:text-zinc-700 transition-colors text-lg leading-none flex-shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
