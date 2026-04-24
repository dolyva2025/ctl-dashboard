'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/themeContext'
import { isAdmin } from '@/lib/config'
import { todayDate } from '@/lib/storage'
import {
  getCTLRules, addCTLRule, deleteCTLRule,
  getUserRules, addUserRule, deleteUserRule,
  getRuleChecks, setRuleCheck,
  type Rule,
} from '@/lib/api'

// ── constants ─────────────────────────────────────────────────────────────────

const CATS = ['Entrada', 'Gestión de Riesgo', 'Psicología', 'Disciplina', 'Contexto', 'Salida']
const CATS_DISPLAY = ['Entrada', 'Gestión de Riesgo', 'Psicología', 'Disciplina', 'Contexto', 'Salida']

const CAT_COLORS: Record<string, string> = {
  'Entrada':           'oklch(68% 0.19 42)',
  'Gestión de Riesgo': 'oklch(65% 0.18 25)',
  'Psicología':        'oklch(68% 0.18 290)',
  'Disciplina':        'oklch(72% 0.18 155)',
  'Contexto':          'oklch(70% 0.17 240)',
  'Salida':            'oklch(68% 0.17 200)',
}

const FIXED_RULES: { id: string; category: string; rule: string }[] = [
  { id: 'fixed-0', category: 'Gestión de Riesgo', rule: 'Siempre usar Stop Loss — sin excepción, en cada operación.' },
  { id: 'fixed-1', category: 'Gestión de Riesgo', rule: 'El riesgo por trade no debe superar el 2% de la cuenta.' },
  { id: 'fixed-2', category: 'Gestión de Riesgo', rule: 'El position sizing debe ser consistente en cada operación.' },
  { id: 'fixed-3', category: 'Gestión de Riesgo', rule: 'Después de dos trades negativos en el día, cerrar la sesión.' },
  { id: 'fixed-4', category: 'Entrada',           rule: 'Solo entrar si tienes un plan claro — si no puedes explicar por qué estás en el trade, el trade no es válido.' },
  { id: 'fixed-5', category: 'Psicología',        rule: 'No hacer revenge trading — si identificas esa emoción, retírate por el día.' },
  { id: 'fixed-6', category: 'Psicología',        rule: 'Cultivar la paciencia — el mejor trade a veces es no operar.' },
]

const ACCENT = 'oklch(68% 0.19 42)'

// ── theme helpers ─────────────────────────────────────────────────────────────

function useT(isDark: boolean) {
  return isDark
    ? {
        bg:         'var(--background)',
        surface:    'hsl(226 48% 11%)',
        surface2:   'hsl(228 35% 14%)',
        border:     'hsl(228 30% 17%)',
        text:       'hsl(228 100% 95%)',
        muted:      'hsl(228 30% 55%)',
        inputBg:    'rgba(255,255,255,0.05)',
      }
    : {
        bg:         'white',
        surface:    'white',
        surface2:   'rgba(0,0,0,0.04)',
        border:     '#e4e4e7',
        text:       '#09090b',
        muted:      '#71717a',
        inputBg:    'rgba(0,0,0,0.04)',
      }
}

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressRing({ pct, isDark }: { pct: number; isDark: boolean }) {
  const r = 28, circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="5" />
        <circle cx="40" cy="40" r={r} fill="none"
          stroke={pct === 100 ? 'oklch(72% 0.18 155)' : ACCENT} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: 'var(--foreground)' }}>{pct}%</span>
      </div>
    </div>
  )
}

type FlatRule = { id: string; ruleKey: string; category: string; rule: string }

function RuleRow({
  r, checked, onToggle, showCheck, onRemove, t, isDark,
}: {
  r: FlatRule
  checked: boolean
  onToggle?: () => void
  showCheck: boolean
  onRemove?: () => void
  t: ReturnType<typeof useT>
  isDark: boolean
}) {
  const color = CAT_COLORS[r.category] || ACCENT
  const bg = showCheck && checked
    ? (isDark ? 'oklch(72% 0.18 155 / 0.1)' : 'oklch(72% 0.18 155 / 0.07)')
    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
  const borderColor = showCheck && checked ? 'oklch(72% 0.18 155 / 0.3)' : t.border

  return (
    <div
      onClick={showCheck ? onToggle : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px', background: bg,
        border: `1px solid ${borderColor}`, borderRadius: 10,
        marginBottom: 6, cursor: showCheck ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      {showCheck ? (
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
          background: checked ? 'oklch(72% 0.18 155)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          border: `1.5px solid ${checked ? 'transparent' : t.muted}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <polyline points="1.5,5 3.8,7.5 8.5,2" stroke="#0A0A0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : (
        <div style={{
          width: 20, height: 20, borderRadius: 5, background: color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 3.8,7.5 8.5,2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.6,
        color: showCheck && !checked ? t.muted : t.text,
      }}>
        {r.rule}
      </span>
      {!showCheck && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 18, padding: '0 2px', flexShrink: 0, opacity: 0.6, lineHeight: 1 }}
        >×</button>
      )}
    </div>
  )
}

function CategoryGroup({
  rules, checks, onToggle, onRemove, showCheck, t, isDark,
}: {
  rules: FlatRule[]
  checks: Record<string, boolean>
  onToggle?: (ruleKey: string) => void
  onRemove?: (id: string) => void
  showCheck: boolean
  t: ReturnType<typeof useT>
  isDark: boolean
}) {
  return (
    <div>
      {CATS_DISPLAY.map((cat) => {
        const catRules = rules.filter((r) => r.category === cat)
        if (!catRules.length) return null
        const color = CAT_COLORS[cat] || ACCENT
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color }}>{cat.toUpperCase()}</span>
            </div>
            {catRules.map((r) => (
              <RuleRow
                key={r.ruleKey}
                r={r}
                checked={!!checks[r.ruleKey]}
                onToggle={onToggle ? () => onToggle(r.ruleKey) : undefined}
                showCheck={showCheck}
                onRemove={onRemove ? () => onRemove(r.id) : undefined}
                t={t}
                isDark={isDark}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AddForm({
  value, onChange, cat, onCat, onAdd, placeholder, t, isDark,
}: {
  value: string
  onChange: (v: string) => void
  cat: string
  onCat: (c: string) => void
  onAdd: () => void
  placeholder: string
  t: ReturnType<typeof useT>
  isDark: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 5 }}>CATEGORÍA</div>
        <select
          value={cat}
          onChange={(e) => onCat(e.target.value)}
          style={{
            background: isDark ? t.surface2 : 'rgba(0,0,0,0.05)',
            border: `1px solid ${t.border}`, borderRadius: 8,
            color: t.text, padding: '8px 11px', fontSize: 12, height: 36,
          }}
        >
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: t.muted, letterSpacing: '0.07em', marginBottom: 5 }}>REGLA</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          style={{
            width: '100%', background: isDark ? t.surface2 : 'rgba(0,0,0,0.05)',
            border: `1px solid ${t.border}`, borderRadius: 8,
            color: t.text, padding: '8px 11px', fontSize: 13, height: 36,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <button
        onClick={onAdd}
        style={{
          height: 36, padding: '0 16px',
          background: t.text, border: 'none', borderRadius: 8,
          color: isDark ? '#0A0A0C' : '#fff',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}
      >+</button>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RulesPage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'navy'
  const t = useT(isDark)

  const [tab, setTab] = useState<'hoy' | 'reglas' | 'colectivas'>('hoy')
  const [ruleSource, setRuleSource] = useState<'all' | 'ctl' | 'mias'>('all')
  const [ctlRules, setCtlRules]     = useState<Rule[]>([])
  const [userRules, setUserRules]   = useState<Rule[]>([])
  const [checks, setChecks]         = useState<Record<string, boolean>>({})
  const [newUserText, setNewUserText] = useState('')
  const [newUserCat, setNewUserCat]   = useState('Entrada')
  const [newCtlText, setNewCtlText]   = useState('')
  const [newCtlCat, setNewCtlCat]     = useState('Entrada')

  const date = todayDate()

  // Load data
  useEffect(() => {
    if (!user) return
    getCTLRules().then(setCtlRules)
    getUserRules(user.id).then(setUserRules)
    getRuleChecks(user.id, date).then(setChecks)
  }, [user, date])

  // Week strip
  const today = new Date()
  const dow = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((dow + 6) % 7))
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

  // Flat rule lists
  const fixedFlat: FlatRule[] = FIXED_RULES.map((r) => ({ ...r, ruleKey: r.id }))
  const ctlFlat: FlatRule[]   = ctlRules.map((r) => ({ id: r.id, ruleKey: `ctl-${r.id}`, category: r.category, rule: r.rule }))
  const userFlat: FlatRule[]  = userRules.map((r) => ({ id: r.id, ruleKey: `user-${r.id}`, category: r.category, rule: r.rule }))
  const allRules = ruleSource === 'ctl'
    ? [...fixedFlat, ...ctlFlat]
    : ruleSource === 'mias'
    ? [...userFlat]
    : [...fixedFlat, ...ctlFlat, ...userFlat]

  const followedCount = allRules.filter((r) => checks[r.ruleKey]).length
  const pct = allRules.length > 0 ? Math.round((followedCount / allRules.length) * 100) : 0

  const handleToggle = useCallback(async (ruleKey: string) => {
    if (!user) return
    const next = !checks[ruleKey]
    setChecks((p) => ({ ...p, [ruleKey]: next }))
    await setRuleCheck(user.id, date, ruleKey, next)
  }, [user, date, checks])

  async function handleAddUserRule() {
    if (!user || !newUserText.trim()) return
    const r = await addUserRule(user.id, newUserCat, newUserText.trim())
    setUserRules((p) => [...p, r])
    setNewUserText('')
  }

  async function handleDeleteUserRule(id: string) {
    await deleteUserRule(id)
    setUserRules((p) => p.filter((r) => r.id !== id))
  }

  async function handleAddCtlRule() {
    if (!newCtlText.trim()) return
    const r = await addCTLRule(newCtlCat, newCtlText.trim())
    setCtlRules((p) => [...p, r])
    setNewCtlText('')
  }

  async function handleDeleteCtlRule(id: string) {
    await deleteCTLRule(id)
    setCtlRules((p) => p.filter((r) => r.id !== id))
  }

  if (loading || !user) return null

  const adminUser = isAdmin(user.email)
  const dateLabel = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())

  const card: React.CSSProperties = {
    background: t.surface,
    borderRadius: 14,
    border: isDark ? `1px solid ${t.border}` : '1px solid #e4e4e7',
    padding: '20px 24px',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', color: t.text, padding: '8px 0 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>
            Reglas de Trading
          </h1>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{dateLabel}</div>
        </div>

        {/* Week strip */}
        <div style={{ display: 'flex', gap: 5 }}>
          {weekDays.map((d, i) => {
            const isT = d.toDateString() === today.toDateString()
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 10px', borderRadius: 9,
                background: isT ? ACCENT : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                border: `1px solid ${isT ? 'transparent' : t.border}`,
              }}>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: isT ? '#0A0A0C' : t.muted }}>{DAYS_SHORT[i]}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: isT ? '#0A0A0C' : t.text }}>{d.getDate()}</span>
                {isT && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.4)' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content',
      }}>
        {([['hoy', 'Sesión de Hoy'], ['reglas', 'Mis Reglas'], ['colectivas', 'Reglas CTL']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '7px 18px', borderRadius: 7, fontSize: 13,
              fontWeight: tab === id ? 600 : 400, cursor: 'pointer', border: 'none',
              background: tab === id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
              color: tab === id ? t.text : t.muted,
              boxShadow: tab === id && !isDark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Sesión de Hoy ──────────────────────────────────────────── */}
      {tab === 'hoy' && (
        <div>
          {/* Rule source toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: t.muted, letterSpacing: '0.06em' }}>MOSTRAR</span>
            <div style={{
              display: 'flex', gap: 2,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderRadius: 8, padding: 3,
            }}>
              {([['all', 'Todas'], ['ctl', 'CTL'], ['mias', 'Mis Reglas']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setRuleSource(id)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12,
                    fontWeight: ruleSource === id ? 600 : 400, cursor: 'pointer', border: 'none',
                    background: ruleSource === id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
                    color: ruleSource === id ? t.text : t.muted,
                    boxShadow: ruleSource === id && !isDark ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Progress summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, ...card, marginBottom: 16 }}>
            <ProgressRing pct={pct} isDark={isDark} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: t.text }}>
                {followedCount} / {allRules.length} reglas seguidas
              </div>
              <div style={{ fontSize: 13, color: t.muted }}>
                {pct === 100 ? '🎯 Sesión perfecta — disciplina completa' :
                 pct >= 70  ? '💪 Buen trabajo, sigue así' :
                 pct >= 40  ? 'Vas bien, queda camino' :
                              'Marca las reglas que aplicaron hoy'}
              </div>
            </div>
          </div>

          {/* All rules checklist */}
          <div style={card}>
            {allRules.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 0', color: t.muted, fontSize: 13 }}>
                  No hay reglas aún — añade desde las otras pestañas
                </div>
              : <CategoryGroup
                  rules={allRules}
                  checks={checks}
                  onToggle={handleToggle}
                  showCheck={true}
                  t={t}
                  isDark={isDark}
                />
            }
          </div>
        </div>
      )}

      {/* ── Tab: Mis Reglas ─────────────────────────────────────────────── */}
      {tab === 'reglas' && (
        <div style={card}>
          <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 16 }}>TUS REGLAS PERSONALES</div>
          <AddForm
            value={newUserText} onChange={setNewUserText}
            cat={newUserCat} onCat={setNewUserCat}
            onAdd={handleAddUserRule}
            placeholder="Escribe tu regla personal..."
            t={t} isDark={isDark}
          />
          {userFlat.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: t.muted, fontSize: 13 }}>
                Agrega tu primera regla personal
              </div>
            : <CategoryGroup
                rules={userFlat}
                checks={{}}
                onRemove={handleDeleteUserRule}
                showCheck={false}
                t={t}
                isDark={isDark}
              />
          }
        </div>
      )}

      {/* ── Tab: Colectivas CTL ─────────────────────────────────────────── */}
      {tab === 'colectivas' && (
        <div style={card}>
          <div style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 16 }}>REGLAS PUBLICADAS PARA EL CANAL</div>
          {adminUser && (
            <AddForm
              value={newCtlText} onChange={setNewCtlText}
              cat={newCtlCat} onCat={setNewCtlCat}
              onAdd={handleAddCtlRule}
              placeholder="Escribe la regla colectiva..."
              t={t} isDark={isDark}
            />
          )}
          <CategoryGroup
            rules={[...fixedFlat, ...ctlFlat]}
            checks={{}}
            onRemove={adminUser ? handleDeleteCtlRule : undefined}
            showCheck={false}
            t={t}
            isDark={isDark}
          />
        </div>
      )}
    </div>
  )
}
