'use client'

import { useState, useEffect } from 'react'
import { TradeForm } from '@/components/TradeForm'
import { TradeTable } from '@/components/TradeTable'
import type { Trade, AccountType } from '@/lib/storage'
import { ACCOUNT_TYPES } from '@/lib/storage'
import { useAuth } from '@/lib/useAuth'
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

function filterByPeriod(trades: Trade[], period: Period): Trade[] {
  if (period === 'all') return trades
  const cutoff = period === 'week' ? getWeekStart() : getMonthStart()
  return trades.filter((t) => t.date >= cutoff)
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all', label: 'Todo' },
]

const ACCOUNT_LABELS: Record<AccountType, string> = {
  'Evaluación': 'Evaluación',
  'Funded': 'Funded',
  'Personal': 'Personal',
}

export default function JournalPage() {
  const { user, loading } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [account, setAccount] = useState<AccountType>('Evaluación')

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
  const visibleTrades = filterByPeriod(accountTrades, period)

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
