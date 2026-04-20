'use client'

import { useState } from 'react'
import type { Trade, Direction, Instrument } from '@/lib/storage'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

const selectClass = "w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"

type EditState = {
  date: string; instrument: Instrument; direction: Direction
  entry: string; stop: string; target: string; exit: string
  rule_adherence: string; notes: string
}

type Props = {
  trades: Trade[]
  onDelete: (id: string) => void
  onEdit: (id: string, updates: Omit<Trade, 'id'>) => Promise<void>
}

function calcPnl(instrument: Instrument, direction: Direction, entry: number, exit: number): number {
  const tickValue = instrument === 'ES' ? 12.5 : instrument === 'NQ' ? 5 : instrument === 'MES' ? 1.25 : 0.5
  const ticks = ((exit - entry) / 0.25) * (direction === 'Long' ? 1 : -1)
  return Math.round(ticks * tickValue * 100) / 100
}

export function TradeTable({ trades, onDelete, onEdit }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(trade: Trade) {
    setEditingId(trade.id)
    setEditState({
      date: trade.date,
      instrument: trade.instrument,
      direction: trade.direction,
      entry: String(trade.entry),
      stop: String(trade.stop),
      target: String(trade.target),
      exit: String(trade.exit),
      rule_adherence: trade.rule_adherence ?? '',
      notes: trade.notes ?? '',
    })
  }

  async function handleSave(trade: Trade) {
    if (!editState) return
    const entryN = parseFloat(editState.entry)
    const stopN = parseFloat(editState.stop)
    const targetN = parseFloat(editState.target)
    const exitN = parseFloat(editState.exit)
    if ([entryN, stopN, targetN, exitN].some(isNaN)) return
    setSaving(true)
    const pnl = calcPnl(editState.instrument, editState.direction, entryN, exitN)
    await onEdit(trade.id, {
      date: editState.date,
      instrument: editState.instrument,
      direction: editState.direction,
      entry: entryN, stop: stopN, target: targetN, exit: exitN,
      pnl,
      account_type: trade.account_type,
      rule_adherence: editState.rule_adherence || undefined,
      notes: editState.notes.trim() || undefined,
    })
    setEditingId(null)
    setEditState(null)
    setSaving(false)
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Aún no has registrado trades. Agrega tu primera operación arriba.
        </p>
      </div>
    )
  }

  const wins = trades.filter((t) => t.pnl > 0).length
  const winRate = Math.round((wins / trades.length) * 100)
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: BarChart2, label: 'Trades', value: trades.length.toString(), color: 'text-card-foreground' },
          { icon: TrendingUp, label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'text-zinc-900' : 'text-zinc-500' },
          {
            icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
            label: 'P&L Total',
            value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            color: totalPnl >= 0 ? 'text-zinc-900' : 'text-zinc-500',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="group relative rounded-lg border bg-card p-6 transition-all duration-300 hover:border-primary/60 hover:shadow-lg">
              <div className="absolute -left-[1px] top-1/2 h-1/2 w-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary/60" />
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background text-primary shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trade log */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">Historial</p>
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Fecha', 'Inst.', 'Dir.', 'Entrada', 'Salida', 'P&L', 'Reglas', 'Notas', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${['Entrada', 'Salida', 'P&L'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((trade) => (
                  <>
                    <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{trade.date}</td>
                      <td className="px-4 py-3 font-semibold text-card-foreground">{trade.instrument}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          trade.direction === 'Long'
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-900 border-zinc-900'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-card-foreground">{trade.entry.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-card-foreground">{trade.exit.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3">
                        {trade.rule_adherence ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            trade.rule_adherence === 'Sí' ? 'bg-zinc-900 text-white border-zinc-900'
                            : trade.rule_adherence === 'Parcialmente' ? 'bg-zinc-600 text-white border-zinc-600'
                            : 'bg-red-500 text-white border-red-500'
                          }`}>{trade.rule_adherence}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{trade.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(trade)} className="text-zinc-300 hover:text-zinc-700 transition-colors" title="Editar">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button onClick={() => onDelete(trade.id)} className="text-zinc-300 hover:text-zinc-700 transition-colors text-xl leading-none" title="Eliminar">×</button>
                        </div>
                      </td>
                    </tr>

                    {editingId === trade.id && editState && (
                      <tr key={`edit-${trade.id}`} className="bg-zinc-50 border-b border-zinc-200">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Fecha</p>
                                <Input type="date" value={editState.date} onChange={(e) => setEditState((s) => s && ({ ...s, date: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Instrumento</p>
                                <select value={editState.instrument} onChange={(e) => setEditState((s) => s && ({ ...s, instrument: e.target.value as Instrument }))} className={selectClass}>
                                  {(['ES', 'NQ', 'MES', 'MNQ'] as Instrument[]).map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Dirección</p>
                                <select value={editState.direction} onChange={(e) => setEditState((s) => s && ({ ...s, direction: e.target.value as Direction }))} className={selectClass}>
                                  <option value="Long">Long</option>
                                  <option value="Short">Short</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Entrada</p>
                                <Input type="number" step="0.25" value={editState.entry} onChange={(e) => setEditState((s) => s && ({ ...s, entry: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Stop</p>
                                <Input type="number" step="0.25" value={editState.stop} onChange={(e) => setEditState((s) => s && ({ ...s, stop: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Objetivo</p>
                                <Input type="number" step="0.25" value={editState.target} onChange={(e) => setEditState((s) => s && ({ ...s, target: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Salida</p>
                                <Input type="number" step="0.25" value={editState.exit} onChange={(e) => setEditState((s) => s && ({ ...s, exit: e.target.value }))} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">¿Seguiste tus reglas?</p>
                              <div className="flex gap-2">
                                {['Sí', 'Parcialmente', 'No'].map((opt) => (
                                  <button key={opt} type="button"
                                    onClick={() => setEditState((s) => s && ({ ...s, rule_adherence: s.rule_adherence === opt ? '' : opt }))}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                                      editState.rule_adherence === opt
                                        ? opt === 'Sí' ? 'bg-zinc-900 text-white border-zinc-900'
                                          : opt === 'Parcialmente' ? 'bg-zinc-600 text-white border-zinc-600'
                                          : 'bg-red-500 text-white border-red-500'
                                        : 'border-input text-muted-foreground hover:border-zinc-400'
                                    }`}>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Notas</p>
                              <textarea value={editState.notes} onChange={(e) => setEditState((s) => s && ({ ...s, notes: e.target.value }))}
                                placeholder="Setup, ejecución, qué funcionó o no..."
                                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none min-h-[60px]" />
                            </div>
                            <div className="flex gap-2">
                              <button disabled={saving} onClick={() => handleSave(trade)}
                                className="bg-zinc-900 hover:bg-black disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                                {saving ? '...' : 'Guardar'}
                              </button>
                              <button onClick={() => { setEditingId(null); setEditState(null) }}
                                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-4 py-2 rounded-lg transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
