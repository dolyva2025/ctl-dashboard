'use client'

import type { Trade } from '@/lib/storage'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

type Props = {
  trades: Trade[]
  onDelete: (id: string) => void
}

export function TradeTable({ trades, onDelete }: Props) {
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
                      <button onClick={() => onDelete(trade.id)} className="text-zinc-300 hover:text-zinc-700 transition-colors text-lg leading-none" title="Eliminar trade">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
