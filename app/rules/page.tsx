'use client'

import { useAuth } from '@/lib/useAuth'
import { CTLRules } from '@/components/CTLRules'

export default function RulesPage() {
  const { user, loading } = useAuth()

  if (loading || !user) return null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-1">Trading</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reglas de Trading</h1>
        <p className="text-muted-foreground mt-1">Las reglas que seguimos cada día en The Collective Trade Lab</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <CTLRules userEmail={user.email} />
      </div>
    </div>
  )
}
