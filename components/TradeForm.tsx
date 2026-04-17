'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Direction, Instrument, Trade } from '@/lib/storage'
import { todayDate } from '@/lib/storage'

const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"

type Props = {
  onAdd: (trade: Omit<Trade, 'id'>) => void
}

export function TradeForm({ onAdd }: Props) {
  const [date, setDate] = useState(todayDate())
  const [instrument, setInstrument] = useState<Instrument>('ES')
  const [direction, setDirection] = useState<Direction>('Long')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [exit, setExit] = useState('')
  const [notes, setNotes] = useState('')
  const [ruleAdherence, setRuleAdherence] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entryN = parseFloat(entry)
    const stopN = parseFloat(stop)
    const targetN = parseFloat(target)
    const exitN = parseFloat(exit)
    if ([entryN, stopN, targetN, exitN].some(isNaN)) return

    const tickValue = instrument === 'ES' ? 12.5 : instrument === 'NQ' ? 5 : instrument === 'MES' ? 1.25 : 0.5
    const ticks = ((exitN - entryN) / 0.25) * (direction === 'Long' ? 1 : -1)
    const pnl = Math.round(ticks * tickValue * 100) / 100

    onAdd({ date, instrument, direction, entry: entryN, stop: stopN, target: targetN, exit: exitN, pnl, notes: notes.trim() || undefined, rule_adherence: ruleAdherence || undefined })
    setEntry('')
    setStop('')
    setTarget('')
    setExit('')
    setNotes('')
    setRuleAdherence('')
  }

  const labelClass = 'text-xs font-medium uppercase tracking-widest text-muted-foreground'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <p className={labelClass}>Fecha</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Instrumento</p>
          <select value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} className={selectClass}>
            {(['ES', 'NQ', 'MES', 'MNQ'] as Instrument[]).map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Dirección</p>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className={selectClass}>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Entrada</p>
          <Input type="number" step="0.25" placeholder="5920.00" value={entry} onChange={(e) => setEntry(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Stop</p>
          <Input type="number" step="0.25" placeholder="5915.00" value={stop} onChange={(e) => setStop(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Objetivo</p>
          <Input type="number" step="0.25" placeholder="5935.00" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Salida</p>
          <Input type="number" step="0.25" placeholder="5932.00" value={exit} onChange={(e) => setExit(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">Registrar</Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>¿Seguiste tus reglas?</p>
        <div className="flex gap-2">
          {['Sí', 'Parcialmente', 'No'].map((opt) => (
            <button key={opt} type="button" onClick={() => setRuleAdherence(ruleAdherence === opt ? '' : opt)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                ruleAdherence === opt
                  ? opt === 'Sí' ? 'bg-zinc-900 text-white border-zinc-900'
                    : opt === 'Parcialmente' ? 'bg-zinc-600 text-white border-zinc-600'
                    : 'bg-red-500 text-white border-red-500'
                  : 'border-input text-muted-foreground hover:border-zinc-400 hover:text-zinc-700'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>Notas (opcional)</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Setup, ejecución, qué funcionó o no..."
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none min-h-[80px]" />
      </div>
    </form>
  )
}
