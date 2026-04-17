# The Collective Trade Lab — Dashboard

Trading dashboard for The Collective Trade Lab YouTube channel (Doly, @dolyva2025).

## Live URLs
- Landing: `collectivetradelab.com` (Cloudflare Pages, project: `twilight-surf-bc9e`)
- Dashboard: `app.collectivetradelab.com` (Vercel, repo: `dolyva2025/ctl-dashboard`)

## Stack
- **Framework:** Next.js 14 App Router
- **Auth + DB:** Supabase (email + password, no email confirmation)
- **Styling:** Tailwind CSS + shadcn/ui primitives
- **Font:** DM Sans (400–900)
- **Deployment:** Vercel (auto-deploys on push to `main`)

## Local Dev
```bash
cd /Users/dolypiraquive/acrual-website/dashboard
npx next dev
# → http://localhost:3000
```

## Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://lfehkvzfhwwvjdtgvxqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lxnYYrpLsU8Z4hCIpkbEgw_AP50L1Hq
```

## Design System

### Colors (B&W)
- **Primary:** `zinc-900` (#18181b) — buttons, icons, active states
- **Background:** `white` / `zinc-50` (cards use `bg-card`)
- **Muted text:** `zinc-400` / `zinc-500`
- **CSS variable:** `--primary: 240 5.9% 10%` in `globals.css`

### Typography
- Headings: `text-3xl font-bold tracking-tight`
- Section labels: `text-xs font-medium uppercase tracking-widest text-zinc-400`
- Card titles: `font-bold text-zinc-900 text-sm`
- Body: `text-sm text-zinc-700`

### Components
- **Buttons:** `bg-zinc-900 hover:bg-black text-white rounded-full`
- **Cards:** `rounded-lg border bg-card p-6`
- **Form areas:** `rounded-lg border border-zinc-200 bg-zinc-50 p-5`
- **Icon containers:** `w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center`
- **Select/Input:** `h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50`

### Badges
- Long trade: `bg-zinc-900 text-white border-zinc-900`
- Short trade: `bg-white text-zinc-900 border-zinc-900`
- Soporte level: `bg-zinc-900 text-white`
- Resistencia level: `bg-white text-zinc-900 border border-zinc-900`

### Scoring Banner Colors
- Opera hoy: black filled, green-500 dot
- Cautela: zinc-100 bg, orange-500 dot
- No operes: white bg + black border, red-500 dot
- Incompleto: zinc-50 bg, zinc-400 dot

## Admin System
- Admin email: `dolypva@gmail.com` (defined in `lib/config.ts`)
- Admin gets `isPremium: true` and display name "Collective Trade Lab"
- `isAdmin(email)` helper available from `lib/config.ts`
- **Vista Free toggle:** Admin-only button in Nav — simulates free user view for YouTube recordings

## Auth Flow
- Login happens at `app.collectivetradelab.com/login`
- Landing page buttons link directly to `/login` on the dashboard
- After login, user lands on Pre-Mercado (`/`)
- `useAuth()` hook in `lib/useAuth.ts` manages session via Supabase

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Pre-Mercado | Daily checklist (9 questions, 8 scored) + WeekSelector |
| `/levels` | Niveles | CTL Bias + CTL Levels (admin publishes, all read) |
| `/rules` | Reglas | CTL rules (left) + Revisión Post-Sesión checklist (right) + WeekSelector |
| `/journal` | Diario | Trade journal with P&L stats + period filter |
| `/login` | Login | Email + password auth (login + signup tabs) |

## Key Components

| Component | Purpose |
|-----------|---------|
| `Checklist` | Pre-market checklist, accepts `userId` + `date` props |
| `CTLBias` | Admin publishes daily bias; read-only for users |
| `CTLLevels` | Admin publishes key levels; read-only for users |
| `CTLRules` | 7 hardcoded rules + dynamic rules (admin can add/delete dynamic) |
| `WeekSelector` | Mon-Fri tabs for current week |
| `TradeForm` | Register trades (instrument, direction, entry/exit, P&L auto-calculated) |
| `TradeTable` | Trade history with stats (win rate, total P&L) |
| `Nav` | Top nav with Vista Free toggle (admin only) |
| `PremiumGate` | Blur + lock overlay — kept in codebase for Phase 2 |
| `RulesChecklist` | Post-session daily checklist — marks which rules were followed, saved by date |

## Supabase Tables

| Table | RLS | Description |
|-------|-----|-------------|
| `routines` | user_id = auth.uid() | Daily checklist answers per user |
| `user_levels` | user_id = auth.uid() | Personal key levels (Phase 2) |
| `user_bias` | user_id = auth.uid() | Personal daily bias (Phase 2) |
| `user_rules` | user_id = auth.uid() | Personal trading rules (Phase 2) |
| `trades` | user_id = auth.uid() | Trade journal entries |
| `ctl_bias` | SELECT open, write = admin | Admin daily bias |
| `ctl_levels` | SELECT open, write = admin | Admin key levels |
| `ctl_rules` | SELECT open, write = admin | Admin trading rules |
| `rule_checks` | user_id = auth.uid() | Daily post-session rule checklist per user |

## Trade P&L Calculation
```
tickValue: ES=12.5 | NQ=5 | MES=1.25 | MNQ=0.5
ticks = ((exit - entry) / 0.25) × (Long ? 1 : -1)
pnl = ticks × tickValue
```

## Pre-Mercado Scoring
- **Scored questions:** indices [0, 2, 3, 4, 5, 6, 7, 8] (question 1 = yesterday's result, not scored)
- **Thresholds:** ≥7 → Opera hoy | ≥5 → Cautela | <5 → No operes
- **Q7 (market structure):** any answer except "Sin claridad" = positive

## Launch Strategy
- **Phase 1 (now):** Everything free — CTL content only, no personal sections visible
- **Phase 2 (~100-200 users):** Unlock personal tools (UserBias, UserLevels, UserRules) — still free
- **Phase 3 (~500+ users):** Paid tier with advanced stats, equity curve, weekly review

## Instrument Options
ES, NQ, MES, MNQ

## Level Types (in order)
Soporte, Resistencia, VWAP, POC, VAH, VAL, VAH (DA), POC (DA), VAH (SA), POC (SA), VAL (SA), Otro

## Rule Categories
Entrada, Salida, Gestión de Riesgo, Psicología

## CTL Fixed Rules (hardcoded in `CTLRules.tsx`)
1. Sigue el plan — No improvises. Si no está en tu plan, no lo tomes.
2. Gestiona el riesgo primero — Define tu stop antes de entrar. Sin stop, sin trade.
3. Opera solo en tus zonas — Espera niveles clave. La paciencia es una ventaja.
4. Controla las emociones — Si estás frustrado, ansioso o eufórico, no operes.
5. Un mal trade no define el día — Acepta la pérdida, resetéate y sigue el proceso.
6. Calidad sobre cantidad — Menos trades, mejor selección. No fuerces setups.
7. Registra todo — Journaling diario. Sin datos no hay mejora.
