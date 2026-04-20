'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, TrendingUp, Activity, Waves } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Instrument, Level, LevelType } from '@/lib/storage'
import { LEVEL_TYPE_OPTIONS } from '@/lib/storage'

const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
import * as api from '@/lib/api'
import { isAdmin } from '@/lib/config'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Support:     { label: 'Soporte',     color: 'text-white',     bg: 'bg-zinc-900',  border: 'border-zinc-900' },
  Resistance:  { label: 'Resistencia', color: 'text-zinc-900',  bg: 'bg-white',     border: 'border-zinc-900' },
  POC:         { label: 'POC',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  VWAP:        { label: 'VWAP',        color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-300' },
  VAH:         { label: 'VAH',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  VAL:         { label: 'VAL',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  'VAH (DA)':  { label: 'VAH (DA)',    color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'POC (DA)':  { label: 'POC (DA)',    color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'VAL (DA)':  { label: 'VAL (DA)',    color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'VAH (SA)':  { label: 'VAH (SA)',    color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'POC (SA)':  { label: 'POC (SA)',    color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'VAL (SA)':  { label: 'VAL (SA)',    color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  Other:       { label: 'Otro',        color: 'text-zinc-400',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  Otro:        { label: 'Otro',        color: 'text-zinc-400',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  other:       { label: 'Otro',        color: 'text-zinc-400',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Support: TrendingUp, Resistance: TrendingDown, POC: Activity, VWAP: Waves,
  VAH: Activity, VAL: Activity,
  'VAH (DA)': Activity, 'POC (DA)': Activity, 'VAL (DA)': Activity,
  'VAH (SA)': Activity, 'POC (SA)': Activity, 'VAL (SA)': Activity,
  Other: Activity,
  Soporte: TrendingUp, Resistencia: TrendingDown, Otro: Activity,
  other: Activity,
}

function getIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Activity
}

const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ']

type EditState = { price: string; type: LevelType; instrument: Instrument; notes: string }

type Props = { date: string; userEmail: string; readOnly?: boolean }

export function CTLLevels({ date, userEmail, readOnly = false }: Props) {
  const isAdminUser = isAdmin(userEmail) && !readOnly
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)

  const [instrument, setInstrument] = useState<Instrument>('ES')
  const [price, setPrice] = useState('')
  const [type, setType] = useState<LevelType>('Support')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ price: '', type: 'Support', instrument: 'ES', notes: '' })

  const fetchLevels = useCallback(async () => {
    setLoading(true)
    const data = await api.getCTLLevels(date)
    setLevels(data)
    setLoading(false)
  }, [date])

  useEffect(() => { fetchLevels() }, [fetchLevels])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(price)
    if (!price || isNaN(parsed)) return
    setSaving(true)
    try {
      const newLevel = await api.addCTLLevel(date, { instrument, price: parsed, type, notes: notes.trim() || undefined })
      setLevels((prev) => [...prev, newLevel])
      setPrice('')
      setNotes('')
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await api.deleteCTLLevel(id)
    setLevels((prev) => prev.filter((l) => l.id !== id))
  }

  function startEdit(level: Level) {
    setEditingId(level.id)
    setEditState({ price: String(level.price), type: level.type as LevelType, instrument: level.instrument, notes: level.notes ?? '' })
  }

  async function handleSaveEdit(id: string) {
    const parsed = parseFloat(editState.price)
    if (isNaN(parsed)) return
    setSaving(true)
    try {
      const updated = await api.updateCTLLevel(id, { price: parsed, type: editState.type, instrument: editState.instrument, notes: editState.notes.trim() || undefined })
      setLevels((prev) => prev.map((l) => l.id === id ? updated : l))
      setEditingId(null)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-sm">Niveles Collective Trade Lab</p>
          <p className="text-xs text-zinc-500">Análisis del día publicado para el canal</p>
        </div>
      </div>

      {isAdminUser && (
        <form onSubmit={handleAdd} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Instrumento</p>
              <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} className={selectClass}>
                {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Precio</p>
              <Input type="number" step="0.25" placeholder="5920.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Tipo</p>
              <select value={type} onChange={(e) => setType(e.target.value as LevelType)} className={selectClass}>
                {LEVEL_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full bg-zinc-900 hover:bg-black text-white">
                {saving ? '...' : 'Publicar'}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Notas (opcional)</p>
            <Input placeholder="Ej. Máximo del día anterior, mirando reacción en este nivel" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 py-4 text-center">Cargando...</p>
      ) : levels.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-zinc-400">Aún no se han publicado niveles para hoy.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {INSTRUMENTS.map((inst) => {
            const group = [...levels.filter((l) => l.instrument === inst)].sort((a, b) => b.price - a.price)
            if (group.length === 0) return null
            return (
              <div key={inst}>
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">{inst}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.map((level) => {
                    const cfg = TYPE_CONFIG[level.type ?? ''] ?? TYPE_CONFIG['Other']
                    const Icon = getIcon(level.type ?? '')
                    const isEditing = editingId === level.id
                    return (
                      <div key={level.id} className="group relative rounded-lg border bg-card p-5 transition-all duration-300 hover:border-primary/60 hover:shadow-lg">
                        <div className="absolute -left-[1px] top-1/2 h-1/2 w-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary/60" />
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Instrumento</p>
                                <select value={editState.instrument} onChange={(e) => setEditState((s) => ({ ...s, instrument: e.target.value as Instrument }))} className={selectClass}>
                                  {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Precio</p>
                                <Input type="number" step="0.25" value={editState.price} onChange={(e) => setEditState((s) => ({ ...s, price: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Tipo</p>
                                <select value={editState.type} onChange={(e) => setEditState((s) => ({ ...s, type: e.target.value as LevelType }))} className={selectClass}>
                                  {LEVEL_TYPE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                                </select>
                              </div>
                            </div>
                            <Input placeholder="Notas (opcional)" value={editState.notes} onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))} />
                            <div className="flex gap-2">
                              <Button size="sm" disabled={saving} onClick={() => handleSaveEdit(level.id)} className="bg-zinc-900 hover:bg-black text-white">
                                {saving ? '...' : 'Guardar'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border bg-background text-primary shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-card-foreground text-lg">
                                  {level.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              {level.notes && <p className="text-sm text-muted-foreground truncate">{level.notes}</p>}
                            </div>
                            {isAdminUser && (
                              <div className="flex-shrink-0 flex items-center gap-2">
                                <button onClick={() => startEdit(level)} className="text-zinc-300 hover:text-zinc-700 transition-colors" title="Editar">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                  </svg>
                                </button>
                                <button onClick={() => handleDelete(level.id)} className="text-zinc-300 hover:text-zinc-700 transition-colors text-xl leading-none" title="Eliminar">×</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
