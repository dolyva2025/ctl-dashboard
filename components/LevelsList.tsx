'use client'

import type { Instrument, Level } from '@/lib/storage'
import { TrendingDown, TrendingUp, Activity, Waves, HelpCircle } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Support:     { label: 'Soporte',     color: 'text-white',     bg: 'bg-zinc-900',  border: 'border-zinc-900' },
  Resistance:  { label: 'Resistencia', color: 'text-zinc-900',  bg: 'bg-white',     border: 'border-zinc-900' },
  POC:         { label: 'POC',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  VWAP:        { label: 'VWAP',        color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-300' },
  VAH:         { label: 'VAH',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  VAL:         { label: 'VAL',         color: 'text-zinc-700',  bg: 'bg-zinc-100',  border: 'border-zinc-300' },
  'VAH (DA)':  { label: 'VAH (Día Anterior)',    color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'POC (DA)':  { label: 'POC (Día Anterior)',    color: 'text-zinc-600',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'VAH (SA)':  { label: 'VAH (Semana Anterior)', color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'POC (SA)':  { label: 'POC (Semana Anterior)', color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  'VAL (SA)':  { label: 'VAL (Semana Anterior)', color: 'text-zinc-500',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
  Other:       { label: 'Otro',        color: 'text-zinc-400',  bg: 'bg-zinc-50',   border: 'border-zinc-200' },
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Support: TrendingUp, Resistance: TrendingDown, POC: Activity, VWAP: Waves,
  VAH: Activity, VAL: Activity,
  'VAH (DA)': Activity, 'POC (DA)': Activity,
  'VAH (SA)': Activity, 'POC (SA)': Activity, 'VAL (SA)': Activity,
  Other: HelpCircle,
}

type Props = {
  levels: Level[]
  onDelete: (id: string) => void
}

const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ']

export function LevelsList({ levels, onDelete }: Props) {
  if (levels.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Aún no has agregado niveles. Agrega tu primer nivel arriba.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {INSTRUMENTS.map((inst) => {
        const group = levels.filter((l) => l.instrument === inst)
        if (group.length === 0) return null
        const sorted = [...group].sort((a, b) => b.price - a.price)

        return (
          <div key={inst}>
            <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">{inst}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sorted.map((level) => {
                const cfg = TYPE_CONFIG[level.type]
                const Icon = TYPE_ICONS[level.type]
                return (
                  <div
                    key={level.id}
                    className="group relative rounded-lg border bg-card p-5 transition-all duration-300 hover:border-primary/60 hover:shadow-lg"
                  >
                    <div className="absolute -left-[1px] top-1/2 h-1/2 w-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary/60" />

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
                        {level.notes && (
                          <p className="text-sm text-muted-foreground truncate">{level.notes}</p>
                        )}
                      </div>

                      <button
                        onClick={() => onDelete(level.id)}
                        className="flex-shrink-0 text-zinc-300 hover:text-zinc-700 transition-colors text-xl leading-none"
                        title="Eliminar nivel"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
