'use client'

import { useState, useEffect } from 'react'
import { getUserRules, addUserRule, deleteUserRule, type Rule } from '@/lib/api'

const CATEGORIES = ['Entrada', 'Salida', 'Gestión de Riesgo', 'Psicología']
const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"

type Props = { userId: string; userName: string; hideHeader?: boolean }

export function UserRules({ userId, userName, hideHeader = false }: Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [rule, setRule] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUserRules(userId).then((data) => { setRules(data); setLoading(false) })
  }, [userId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!rule.trim()) return
    setSaving(true)
    const newRule = await addUserRule(userId, category, rule.trim())
    setRules((prev) => [...prev, newRule])
    setRule('')
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteUserRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const grouped = CATEGORIES.reduce<Record<string, Rule[]>>((acc, cat) => {
    acc[cat] = rules.filter((r) => r.category === cat)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm">Reglas</p>
            {userName && <p className="text-xs text-zinc-500">{userName}</p>}
          </div>
        </div>
      )}

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
                placeholder="Escribe tu regla..."
                className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              <button type="submit" disabled={saving}
                className="bg-zinc-900 hover:bg-black disabled:opacity-60 text-white text-sm font-semibold px-4 rounded-lg transition-colors">
                {saving ? '...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-400 py-4 text-center">Cargando...</p>
      ) : rules.length === 0 ? null : (
        <div className="space-y-5">
          {CATEGORIES.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                      <p className="text-sm text-zinc-700 leading-relaxed">{r.rule}</p>
                      <button onClick={() => handleDelete(r.id)} className="text-zinc-300 hover:text-zinc-700 transition-colors text-lg leading-none flex-shrink-0">×</button>
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
