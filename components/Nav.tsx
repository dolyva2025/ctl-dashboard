'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { usePreview } from '@/lib/previewContext'
import { isAdmin } from '@/lib/config'

const links = [
  { href: '/', label: 'Análisis Pre Sesión' },
  { href: '/levels', label: 'Pre-Market Plan' },
  { href: '/rules', label: 'Reglas' },
  { href: '/journal', label: 'Diario' },
  { href: '/habitos', label: 'Hábitos' },
]

export function Nav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { previewFree, togglePreview } = usePreview()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">
            The Collective Trade Lab
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active ? 'text-zinc-900 font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="flex items-center gap-4 shrink-0">
            {isAdmin(user.email) && (
              <button
                onClick={togglePreview}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                  previewFree
                    ? 'bg-amber-400 border-amber-400 text-zinc-900 hover:bg-amber-500'
                    : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700'
                }`}
              >
                {previewFree ? '👁 Vista Free' : 'Vista Free'}
              </button>
            )}
            <span className="text-sm text-slate-500 hidden sm:block">
              Hola, <span className="font-semibold text-slate-800">{user.name.split(' ')[0]}</span>
            </span>
            <button
              onClick={logout}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 hover:border-slate-300 px-4 py-1.5 rounded-full"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
