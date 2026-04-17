'use client'

type Props = { children: React.ReactNode; label?: string; bypass?: boolean }

export function PremiumGate({ children, label = 'Función Premium', bypass = false }: Props) {
  if (bypass) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/70 backdrop-blur-[2px]">
        <div className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          {label}
        </div>
        <p className="text-xs text-zinc-500 text-center px-6">Disponible para miembros del canal</p>
      </div>
    </div>
  )
}
