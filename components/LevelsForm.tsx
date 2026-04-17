'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Instrument, Level, LevelType } from '@/lib/storage'
import { LEVEL_TYPE_OPTIONS } from '@/lib/storage'

const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"

type Props = {
  onAdd: (level: Omit<Level, 'id'>) => void
}

export function LevelsForm({ onAdd }: Props) {
  const [instrument, setInstrument] = useState<Instrument>('ES')
  const [price, setPrice] = useState('')
  const [type, setType] = useState<LevelType>('Support')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(price)
    if (!price || isNaN(parsed)) return
    onAdd({ instrument, price: parsed, type, notes: notes.trim() || undefined })
    setPrice('')
    setNotes('')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Instrumento</p>
          <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} className={selectClass}>
            {(['ES', 'NQ', 'MES', 'MNQ'] as Instrument[]).map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Precio</p>
          <Input type="number" step="0.25" placeholder="5920.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tipo</p>
          <select value={type} onChange={(e) => setType(e.target.value as LevelType)} className={selectClass}>
            {LEVEL_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button type="submit" className="w-full">Agregar</Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notas (opcional)</p>
        <Input placeholder="Ej. Máximo del día anterior, mirando reacción en este nivel" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </form>
  )
}
