export type DailyRoutine = {
  date: string
  answers: (string | null)[]  // 9 answers, index 0–8
  notes: string[]             // 9 optional notes
  completed: boolean
}

export type LevelType = 'Support' | 'Resistance' | 'POC' | 'VWAP' | 'VAH' | 'VAL' | 'VAH (DA)' | 'POC (DA)' | 'VAL (DA)' | 'VAH (SA)' | 'POC (SA)' | 'VAL (SA)' | 'Other'

export const LEVEL_TYPE_OPTIONS: { value: LevelType; label: string }[] = [
  { value: 'Support',    label: 'Soporte'     },
  { value: 'Resistance', label: 'Resistencia' },
  { value: 'VWAP',       label: 'VWAP'        },
  { value: 'POC',        label: 'POC'         },
  { value: 'VAH',        label: 'VAH'         },
  { value: 'VAL',        label: 'VAL'         },
  { value: 'VAH (DA)',   label: 'VAH (Día Anterior)'    },
  { value: 'POC (DA)',   label: 'POC (Día Anterior)'    },
  { value: 'VAL (DA)',   label: 'VAL (Día Anterior)'    },
  { value: 'VAH (SA)',   label: 'VAH (Semana Anterior)' },
  { value: 'POC (SA)',   label: 'POC (Semana Anterior)' },
  { value: 'VAL (SA)',   label: 'VAL (Semana Anterior)' },
  { value: 'Other',      label: 'Otro'        },
]
export type Instrument = 'ES' | 'NQ' | 'MES' | 'MNQ'

export type Level = {
  id: string
  instrument: Instrument
  price: number
  type: LevelType
  notes?: string
}

export type DailyLevels = {
  date: string
  levels: Level[]
}

export type Direction = 'Long' | 'Short'

export type AccountType = 'Evaluación' | 'Funded' | 'Personal'

export const ACCOUNT_TYPES: AccountType[] = ['Evaluación', 'Funded', 'Personal']

export type Trade = {
  id: string
  date: string
  instrument: Instrument
  direction: Direction
  entry: number
  stop: number
  target: number
  exit: number
  pnl: number
  account_type: AccountType
  notes?: string
  emotions?: string
  reflection?: string
  rule_adherence?: string
}

export type TradeLog = {
  trades: Trade[]
}

// --- Helpers ---

export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  return localDateStr()
}

// --- Routine ---

export function getRoutine(date?: string): DailyRoutine {
  const key = `routine-${date ?? todayKey()}`
  if (typeof window === 'undefined') return emptyRoutine(date ?? todayKey())
  const raw = localStorage.getItem(key)
  if (!raw) return emptyRoutine(date ?? todayKey())
  const parsed = JSON.parse(raw)
  // Migrate old format (checklist object) to new array format
  if (!Array.isArray(parsed.answers)) return emptyRoutine(date ?? todayKey())
  return parsed
}

export function saveRoutine(routine: DailyRoutine): void {
  const key = `routine-${routine.date}`
  localStorage.setItem(key, JSON.stringify(routine))
}

function emptyRoutine(date: string): DailyRoutine {
  return {
    date,
    answers: Array(9).fill(null),
    notes: Array(9).fill(''),
    completed: false,
  }
}

// --- Levels ---

export function getLevels(date?: string): DailyLevels {
  const key = `levels-${date ?? todayKey()}`
  if (typeof window === 'undefined') return { date: date ?? todayKey(), levels: [] }
  const raw = localStorage.getItem(key)
  if (!raw) return { date: date ?? todayKey(), levels: [] }
  return JSON.parse(raw)
}

export function saveLevels(data: DailyLevels): void {
  const key = `levels-${data.date}`
  localStorage.setItem(key, JSON.stringify(data))
}

// --- Journal ---

export function getTradeLog(): TradeLog {
  if (typeof window === 'undefined') return { trades: [] }
  const raw = localStorage.getItem('journal')
  if (!raw) return { trades: [] }
  return JSON.parse(raw)
}

export function saveTradeLog(log: TradeLog): void {
  localStorage.setItem('journal', JSON.stringify(log))
}

export function todayDate(): string {
  return todayKey()
}
