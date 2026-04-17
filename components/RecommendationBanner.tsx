'use client'

import type { ScoringResult } from '@/lib/scoring'

const colorMap = {
  green: 'bg-zinc-900 border-zinc-900 text-white',
  yellow: 'bg-zinc-100 border-zinc-400 text-zinc-800',
  red: 'bg-white border-zinc-900 text-zinc-900',
  gray: 'bg-zinc-50 border-zinc-200 text-zinc-500',
}

const dotMap = {
  green: 'bg-green-500',
  yellow: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-zinc-400',
}

export function RecommendationBanner({ result }: { result: ScoringResult }) {
  return (
    <div className={`rounded-xl border-2 px-6 py-5 ${colorMap[result.color]}`}>
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${dotMap[result.color]}`} />
        <span className="text-lg font-semibold tracking-tight">{result.label}</span>
        {result.recommendation !== 'incomplete' && (
          <span className="ml-auto text-sm font-medium opacity-70">
            {result.score}/{result.total}
          </span>
        )}
      </div>
      <p className="mt-1 ml-6 text-sm opacity-80">{result.description}</p>
    </div>
  )
}
