import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const FILE = join(process.cwd(), 'data', 'ctl-levels.json')

type Level = {
  id: string
  instrument: string
  price: number
  type: string
  notes?: string
}

type Store = Record<string, Level[]> // keyed by date YYYY-MM-DD

function read(): Store {
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function write(store: Store) {
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? today()
  const store = read()
  return NextResponse.json(store[date] ?? [])
}

export async function POST(req: NextRequest) {
  const { date, level } = await req.json()
  const store = read()
  const day = store[date] ?? []
  const newLevel: Level = { ...level, id: crypto.randomUUID() }
  store[date] = [...day, newLevel]
  write(store)
  return NextResponse.json(newLevel)
}

export async function DELETE(req: NextRequest) {
  const { date, id } = await req.json()
  const store = read()
  store[date] = (store[date] ?? []).filter((l) => l.id !== id)
  write(store)
  return NextResponse.json({ ok: true })
}

function today() {
  return new Date().toISOString().split('T')[0]
}
