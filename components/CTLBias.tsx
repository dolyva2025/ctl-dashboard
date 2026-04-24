'use client'

import { useState, useEffect } from 'react'
import { getCTLBias, saveCTLBias, deleteCTLBias, type BiasEntry } from '@/lib/api'
import { isAdmin } from '@/lib/config'

const BIAS_OPTIONS = ['Alcista', 'Bajista', 'Neutral']
const empty: BiasEntry = { bias: '', setup: '', key_levels: '', avoid: '', notes: '' }

const textareaClass = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none min-h-[80px]"
const labelClass = "text-xs font-medium uppercase tracking-widest text-muted-foreground"
const selectClass = "w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"

type Props = { date: string; userEmail: string; readOnly?: boolean; hideHeader?: boolean }

export function CTLBias({ date, userEmail, readOnly = false, hideHeader = false }: Props) {
  const isAdminUser = isAdmin(userEmail) && !readOnly
  const [entry, setEntry] = useState<BiasEntry>(empty)
  const [saved, setSaved] = useState<BiasEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getCTLBias(date).then((data) => {
      setSaved(data)
      if (data) setEntry(data)
      setLoading(false)
    })
  }, [date])

  async function handleSave() {
    setSaving(true)
    await saveCTLBias(date, entry)
    setSaved(entry)
    setEditing(false)
    setSaving(false)
  }

  async function handleDelete() {
    await deleteCTLBias(date)
    setSaved(null)
    setEntry(empty)
    setEditing(false)
  }

  const biasColor = saved?.bias === 'Alcista'
    ? 'text-green-600 dark:text-green-400'
    : saved?.bias === 'Bajista'
    ? 'text-red-500 dark:text-red-400'
    : 'text-muted-foreground'

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Bias Collective Trade Lab</p>
              <p className="text-xs text-muted-foreground">Plan del día publicado para el canal</p>
            </div>
          </div>
          {isAdminUser && saved && !editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-full">Editar</button>
              <button onClick={handleDelete} className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors">Eliminar</button>
            </div>
          )}
        </div>
      )}
      {hideHeader && isAdminUser && saved && !editing && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-full">Editar bias</button>
          <button onClick={handleDelete} className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors">Eliminar</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
      ) : !saved && !isAdminUser ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Aún no se ha publicado el bias para hoy.</p>
        </div>
      ) : (isAdminUser && (!saved || editing)) ? (
        /* Admin form */
        <div className="rounded-lg border bg-muted p-5 space-y-4">
          <div className="space-y-1.5">
            <p className={labelClass}>Bias</p>
            <select value={entry.bias} onChange={(e) => setEntry({ ...entry, bias: e.target.value })} className={selectClass}>
              <option value="">Seleccionar...</option>
              {BIAS_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
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
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-5 py-2 rounded-full transition-colors">
              {saving ? 'Guardando...' : 'Publicar'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setEntry(saved!) }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border px-5 py-2 rounded-full">
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : saved ? (
        /* Read-only view */
        <div className="space-y-4">
          {saved.bias && (
            <div className="flex items-center gap-2">
              <span className={labelClass}>Bias</span>
              <span className={`font-bold text-base ${biasColor}`}>{saved.bias}</span>
            </div>
          )}
          {[
            { label: 'Setup principal', value: saved.setup },
            { label: 'Niveles clave', value: saved.key_levels },
            { label: 'Qué evitar', value: saved.avoid },
            { label: 'Notas libres', value: saved.notes },
          ].filter(f => f.value).map(({ label, value }) => (
            <div key={label} className="space-y-1">
              <p className={labelClass}>{label}</p>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
