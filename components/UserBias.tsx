'use client'

import { useState, useEffect } from 'react'
import { getUserBias, saveUserBias, type BiasEntry } from '@/lib/api'

const BIAS_OPTIONS = ['Alcista', 'Bajista', 'Neutral']
const empty: BiasEntry = { bias: '', setup: '', key_levels: '', avoid: '', notes: '' }

const textareaClass = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none min-h-[80px]"
const labelClass = "text-xs font-medium uppercase tracking-widest text-zinc-500"

type Props = { userId: string; date: string; userName: string; hideHeader?: boolean }

export function UserBias({ userId, date, userName, hideHeader = false }: Props) {
  const [entry, setEntry] = useState<BiasEntry>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getUserBias(userId, date).then((data) => {
      if (data) setEntry(data)
      setLoading(false)
    })
  }, [userId, date])

  async function handleSave() {
    setSaving(true)
    await saveUserBias(userId, date, entry)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const biasColor = entry.bias === 'Alcista' ? 'text-green-600' : entry.bias === 'Bajista' ? 'text-red-500' : 'text-zinc-500'
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading) return <p className="text-sm text-zinc-400 py-4 text-center">Cargando...</p>

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm">Bias</p>
            <p className="text-xs text-zinc-500">{userName}</p>
          </div>
        </div>
      )}
      <p className="text-sm text-zinc-500 capitalize">{formattedDate}</p>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-4">
        <div className="space-y-1.5">
          <p className={labelClass}>Bias</p>
          <select value={entry.bias} onChange={(e) => setEntry({ ...entry, bias: e.target.value })}
            className={`w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 ${biasColor} font-semibold`}>
            <option value="" className="text-zinc-500 font-normal">Seleccionar...</option>
            {BIAS_OPTIONS.map((b) => <option key={b} value={b} className="text-zinc-900 font-normal">{b}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Setup principal</p>
          <textarea value={entry.setup} onChange={(e) => setEntry({ ...entry, setup: e.target.value })}
            placeholder="¿Qué setup estás buscando hoy?" className={textareaClass} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Niveles clave</p>
          <textarea value={entry.key_levels} onChange={(e) => setEntry({ ...entry, key_levels: e.target.value })}
            placeholder="Los niveles más importantes del día..." className={textareaClass} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Qué evitar</p>
          <textarea value={entry.avoid} onChange={(e) => setEntry({ ...entry, avoid: e.target.value })}
            placeholder="Condiciones en las que no debes operar hoy..." className={textareaClass} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Notas libres</p>
          <textarea value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
            placeholder="Cualquier otra observación del mercado..." className={textareaClass} />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-zinc-900 hover:bg-black disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Bias'}
        </button>
      </div>
    </div>
  )
}
