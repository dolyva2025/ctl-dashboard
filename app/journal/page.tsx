'use client'

import { useState, useEffect } from 'react'
import { TradeForm } from '@/components/TradeForm'
import { TradeTable } from '@/components/TradeTable'
import { WeekSelector } from '@/components/WeekSelector'
import type { Trade, AccountType } from '@/lib/storage'
import { ACCOUNT_TYPES } from '@/lib/storage'
import { useAuth } from '@/lib/useAuth'
import { todayDate } from '@/lib/storage'
import * as api from '@/lib/api'

type Period = 'week' | 'month' | 'all'

function getWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

function getMonthStart(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

const ACCOUNT_LABELS: Record<AccountType, string> = {
  'Evaluación': 'Evaluación',
  'Funded': 'Funded',
  'Personal': 'Personal',
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all', label: 'Todo' },
]

// ── Month Calendar ────────────────────────────────────────────────────────────

function MonthCalendar({ trades, selectedDay, onSelectDay }: {
  trades: Trade[]
  selectedDay: string | null
  onSelectDay: (date: string | null) => void
}) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start grid on Monday
  const startDow = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()

  // Group trades by date
  const byDate: Record<string, Trade[]> = {}
  for (const t of trades) {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  }

  function worstRule(dayTrades: Trade[]): string | null {
    const adherences = dayTrades.map((t) => t.rule_adherence).filter(Boolean) as string[]
    if (adherences.length === 0) return null
    if (adherences.some((a) => a === 'No')) return 'No'
    if (adherences.some((a) => a === 'Parcialmente')) return 'Parcialmente'
    return 'Sí'
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const todayStr = todayDate()

  return (
    <div className="rounded-lg border border-zinc-900 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-zinc-900">{monthName}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-900">
          <span className="font-medium">Reglas:</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-zinc-900" />Sí, las seguí</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-zinc-400" />Parcialmente</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-500" />No las seguí</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
          <p key={d} className="text-xs font-semibold text-zinc-900 text-center py-1">{d}</p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayTrades = byDate[dateStr] ?? []
          const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
          const wins = dayTrades.filter((t) => t.pnl > 0).length
          const winRate = dayTrades.length > 0 ? Math.round((wins / dayTrades.length) * 100) : null
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay
          const hasTrades = dayTrades.length > 0
          const rule = worstRule(dayTrades)

          const ruleBg = rule === 'No' ? 'bg-red-500' : rule === 'Parcialmente' ? 'bg-zinc-400' : 'bg-zinc-900'
          const ruleTextColor = 'text-white'

          return (
            <button
              key={dateStr}
              onClick={() => hasTrades ? onSelectDay(isSelected ? null : dateStr) : undefined}
              className={`rounded-lg border border-zinc-900 bg-white p-2 text-left transition-all h-[88px] ${
                isSelected ? 'ring-2 ring-zinc-900' : isToday ? 'ring-1 ring-zinc-400' : ''
              } ${hasTrades ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default'}`}
            >
              <p className="text-xs font-bold mb-1 text-zinc-900">{day}</p>
              {hasTrades ? (
                <div className="space-y-1">
                  <p className={`text-sm font-black leading-none ${pnl >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                    {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">{winRate}% WR</p>
                  {rule && (
                    <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded ${ruleBg} ${ruleTextColor}`}>
                      {rule}
                    </span>
                  )}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      {selectedDay && (
        <button onClick={() => onSelectDay(null)} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
          Mostrar todo el mes →
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { user, loading } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [account, setAccount] = useState<AccountType>('Evaluación')
  const [weekDay, setWeekDay] = useState(todayDate())
  const [calendarDay, setCalendarDay] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.getTrades(user.id).then(setTrades)
  }, [user])

  async function handleAdd(trade: Omit<Trade, 'id'>) {
    if (!user) return
    const newTrade = await api.addTrade(user.id, trade)
    setTrades((prev) => [newTrade, ...prev])
  }

  async function handleDelete(id: string) {
    await api.deleteTrade(id)
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleEdit(id: string, updates: Omit<Trade, 'id'>) {
    const updated = await api.updateTrade(id, updates)
    setTrades((prev) => prev.map((t) => t.id === id ? updated : t))
  }

  if (loading || !user) return null

  const accountTrades = trades.filter((t) => t.account_type === account)

  // Filter by period
  let visibleTrades: Trade[]
  if (period === 'week') {
    visibleTrades = accountTrades.filter((t) => t.date === weekDay)
  } else if (period === 'month') {
    const monthStart = getMonthStart()
    const monthTrades = accountTrades.filter((t) => t.date >= monthStart)
    visibleTrades = calendarDay ? monthTrades.filter((t) => t.date === calendarDay) : monthTrades
  } else {
    visibleTrades = accountTrades
  }

  const monthAccountTrades = accountTrades.filter((t) => t.date >= getMonthStart())

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Trading</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Diario de Trades</h1>
          <p className="text-muted-foreground mt-1">Registra y revisa tus operaciones</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                period === key
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Account tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
        {ACCOUNT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setAccount(type)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              account === type
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'
            }`}
          >
            {ACCOUNT_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Week day selector */}
      {period === 'week' && (
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Día</p>
          <WeekSelector selected={weekDay} onChange={setWeekDay} />
        </div>
      )}

      {/* Month calendar */}
      {period === 'month' && (
        <MonthCalendar
          trades={monthAccountTrades}
          selectedDay={calendarDay}
          onSelectDay={setCalendarDay}
        />
      )}

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-4">Registrar Trade</p>
        <TradeForm onAdd={handleAdd} defaultAccount={account} />
      </div>

      <div>
        <TradeTable trades={visibleTrades} onDelete={handleDelete} onEdit={handleEdit} />
      </div>
    </div>
  )
}
