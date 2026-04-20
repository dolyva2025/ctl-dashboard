import { supabase } from './supabase'
import type { DailyRoutine, Level, Trade, Instrument, LevelType, Direction, AccountType } from './storage'

export type Rule = {
  id: string
  category: string
  rule: string
}

export type BiasEntry = {
  bias: string
  setup: string
  key_levels: string
  avoid: string
  notes: string
}

// ── CTL Bias ──────────────────────────────────────────────────────────────────

export async function getCTLBias(date: string): Promise<BiasEntry | null> {
  const { data } = await supabase
    .from('ctl_bias')
    .select('*')
    .eq('date', date)
    .maybeSingle()
  if (!data) return null
  return { bias: data.bias ?? '', setup: data.setup ?? '', key_levels: data.key_levels ?? '', avoid: data.avoid ?? '', notes: data.notes ?? '' }
}

export async function saveCTLBias(date: string, entry: BiasEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('ctl_bias').upsert(
    { published_by: user.id, date, ...entry },
    { onConflict: 'date' }
  )
}

export async function deleteCTLBias(date: string): Promise<void> {
  await supabase.from('ctl_bias').delete().eq('date', date)
}

// ── User Bias ─────────────────────────────────────────────────────────────────

export async function getUserBias(userId: string, date: string): Promise<BiasEntry | null> {
  const { data } = await supabase
    .from('user_bias')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (!data) return null
  return { bias: data.bias ?? '', setup: data.setup ?? '', key_levels: data.key_levels ?? '', avoid: data.avoid ?? '', notes: data.notes ?? '' }
}

export async function saveUserBias(userId: string, date: string, entry: BiasEntry): Promise<void> {
  await supabase.from('user_bias').upsert(
    { user_id: userId, date, ...entry },
    { onConflict: 'user_id,date' }
  )
}

// ── Routines ──────────────────────────────────────────────────────────────────

export async function getRoutine(userId: string, date: string): Promise<DailyRoutine> {
  const { data } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (!data) {
    return { date, answers: Array(9).fill(null), notes: Array(9).fill(''), completed: false }
  }

  return { date, answers: data.answers, notes: data.notes, completed: data.completed }
}

export async function saveRoutine(userId: string, routine: DailyRoutine): Promise<void> {
  await supabase.from('routines').upsert(
    { user_id: userId, date: routine.date, answers: routine.answers, notes: routine.notes, completed: routine.completed },
    { onConflict: 'user_id,date' }
  )
}

// ── User Levels ───────────────────────────────────────────────────────────────

export async function getLevels(userId: string, date: string): Promise<Level[]> {
  const { data } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    instrument: row.instrument as Instrument,
    price: Number(row.price),
    type: (row.type ?? 'Other') as LevelType,
    notes: row.notes ?? undefined,
  }))
}

export async function addLevel(userId: string, date: string, level: Omit<Level, 'id'>): Promise<Level> {
  const { data, error } = await supabase
    .from('user_levels')
    .insert({ user_id: userId, date, ...level })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, instrument: data.instrument as Instrument, price: Number(data.price), type: data.type as LevelType, notes: data.notes ?? undefined }
}

export async function deleteLevel(id: string): Promise<void> {
  await supabase.from('user_levels').delete().eq('id', id)
}

// ── CTL Levels ────────────────────────────────────────────────────────────────

export async function getCTLLevels(date: string): Promise<Level[]> {
  const { data } = await supabase
    .from('ctl_levels')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    instrument: row.instrument as Instrument,
    price: Number(row.price),
    type: (row.type === 'other' ? 'Other' : row.type ?? 'Other') as LevelType,
    notes: row.notes ?? undefined,
  }))
}

export async function addCTLLevel(date: string, level: Omit<Level, 'id'>): Promise<Level> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('ctl_levels')
    .insert({ published_by: user.id, date, ...level })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, instrument: data.instrument as Instrument, price: Number(data.price), type: data.type as LevelType, notes: data.notes ?? undefined }
}

export async function updateCTLLevel(id: string, updates: { price: number; type: LevelType; instrument: Instrument; notes?: string }): Promise<Level> {
  const { data, error } = await supabase
    .from('ctl_levels')
    .update({ price: updates.price, type: updates.type, instrument: updates.instrument, notes: updates.notes ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { id: data.id, instrument: data.instrument as Instrument, price: Number(data.price), type: data.type as LevelType, notes: data.notes ?? undefined }
}

export async function deleteCTLLevel(id: string): Promise<void> {
  await supabase.from('ctl_levels').delete().eq('id', id)
}

// ── Trades ────────────────────────────────────────────────────────────────────

export async function getTrades(userId: string): Promise<Trade[]> {
  const { data } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    instrument: row.instrument as Instrument,
    direction: row.direction as Direction,
    entry: Number(row.entry),
    stop: Number(row.stop),
    target: Number(row.target),
    exit: Number(row.exit),
    pnl: Number(row.pnl),
    account_type: (row.account_type ?? 'Personal') as AccountType,
    notes: row.notes ?? undefined,
    emotions: row.emotions ?? undefined,
    reflection: row.reflection ?? undefined,
    rule_adherence: row.rule_adherence ?? undefined,
  }))
}

export async function addTrade(userId: string, trade: Omit<Trade, 'id'>): Promise<Trade> {
  const { data, error } = await supabase
    .from('trades')
    .insert({ user_id: userId, ...trade })
    .select()
    .single()

  if (error) throw error
  return { ...trade, id: data.id }
}

export async function updateTrade(id: string, updates: Omit<Trade, 'id'>): Promise<Trade> {
  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...updates, id: data.id }
}

export async function deleteTrade(id: string): Promise<void> {
  await supabase.from('trades').delete().eq('id', id)
}

// ── CTL Rules ─────────────────────────────────────────────────────────────────

export async function getCTLRules(): Promise<Rule[]> {
  const { data } = await supabase.from('ctl_rules').select('*').order('position').order('created_at')
  return (data ?? []).map((r) => ({ id: r.id, category: r.category, rule: r.rule }))
}

export async function addCTLRule(category: string, rule: string): Promise<Rule> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('ctl_rules').insert({ published_by: user.id, category, rule }).select().single()
  if (error) throw error
  return { id: data.id, category: data.category, rule: data.rule }
}

export async function deleteCTLRule(id: string): Promise<void> {
  await supabase.from('ctl_rules').delete().eq('id', id)
}

// ── User Rules ────────────────────────────────────────────────────────────────

export async function getUserRules(userId: string): Promise<Rule[]> {
  const { data } = await supabase.from('user_rules').select('*').eq('user_id', userId).order('created_at')
  return (data ?? []).map((r) => ({ id: r.id, category: r.category, rule: r.rule }))
}

export async function addUserRule(userId: string, category: string, rule: string): Promise<Rule> {
  const { data, error } = await supabase.from('user_rules').insert({ user_id: userId, category, rule }).select().single()
  if (error) throw error
  return { id: data.id, category: data.category, rule: data.rule }
}

export async function deleteUserRule(id: string): Promise<void> {
  await supabase.from('user_rules').delete().eq('id', id)
}

// ── Rule Checks ───────────────────────────────────────────────────────────────

export async function getRuleChecks(userId: string, date: string): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('rule_checks')
    .select('rule_key, checked')
    .eq('user_id', userId)
    .eq('date', date)
  const result: Record<string, boolean> = {}
  for (const row of data ?? []) result[row.rule_key] = row.checked
  return result
}

export async function setRuleCheck(userId: string, date: string, ruleKey: string, checked: boolean): Promise<void> {
  await supabase.from('rule_checks').upsert(
    { user_id: userId, date, rule_key: ruleKey, checked },
    { onConflict: 'user_id,date,rule_key' }
  )
}
