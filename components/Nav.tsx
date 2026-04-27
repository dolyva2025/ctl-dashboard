'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { usePreview } from '@/lib/previewContext'
import { useTheme } from '@/lib/themeContext'
import { isAdmin } from '@/lib/config'

const links = [
  { href: '/', label: 'Análisis Pre Sesión' },
  { href: '/levels', label: 'Pre-Market Plan' },
  { href: '/rules', label: 'Reglas' },
  { href: '/journal', label: 'Diario de Trading' },
  { href: '/habitos', label: 'Hábitos' },
]

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export function Nav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { previewFree, togglePreview } = usePreview()
  const { theme, toggle } = useTheme()
  const isDark = theme === 'navy'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <span className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            The Collective Trade Lab
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {user && (
            <>
              {isAdmin(user.email) && (
                <button
                  onClick={togglePreview}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                    previewFree
                      ? 'bg-amber-400 border-amber-400 text-zinc-900 hover:bg-amber-500'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {previewFree ? '👁 Vista Free' : 'Vista Free'}
                </button>
              )}
              <span className="text-sm text-muted-foreground hidden sm:block">
                Hola, <span className="font-semibold text-foreground">{user.name.split(' ')[0]}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/40 px-4 py-1.5 rounded-full"
              >
                Salir
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
